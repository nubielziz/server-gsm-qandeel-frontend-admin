// Tests for how a live event changes what the screens hold: a message is added once and in id order, a ticket row only replaces an older one, a seen mark only moves
// forward, and the patches reach every cached page and thread (and create nothing that was not cached).
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { detail, message, reply, row } from '../test/fixtures';
import { ticketDetailKey, TICKET_LISTS_KEY } from '../hooks/keys';
import {
  appendMessage,
  applyRead,
  findCachedTicket,
  mergeRow,
  newestRequesterMessageId,
  patchDetailWithMessage,
  patchDetailWithRead,
  patchDetailWithRow,
  patchListsAsSeen,
  patchListsWithRead,
  patchListsWithRow,
  type DetailCache,
  type ListCache,
} from './liveCache';

const read = (
  change: Partial<{ ticketId: number; by: 'requester' | 'staff'; upToMessageId: number; at: string }> = {},
) => ({
  ticketId: 10,
  by: 'staff' as const,
  upToMessageId: 3,
  at: '2026-11-15T11:00:00.000Z',
  ...change,
});

describe('appendMessage', () => {
  const cache: DetailCache = { data: detail([message(1), reply(2), message(5)]) };

  it('adds a message in id order, wherever it arrives', () => {
    expect(appendMessage(cache, message(9))?.data.messages.map((m) => m.id)).toEqual([1, 2, 5, 9]);
    expect(appendMessage(cache, message(3))?.data.messages.map((m) => m.id)).toEqual([1, 2, 3, 5]);
    expect(appendMessage(cache, message(0))?.data.messages.map((m) => m.id)).toEqual([0, 1, 2, 5]);
  });

  it('returns the same cache for a message that is there already, a message of another ticket, or no cache', () => {
    expect(appendMessage(cache, message(2))).toBe(cache);
    expect(appendMessage(cache, message(7, { ticketId: 99 }))).toBe(cache);
    expect(appendMessage(undefined, message(7))).toBeUndefined();
  });
});

describe('newestRequesterMessageId', () => {
  it('is the highest id of the requester’s messages, 0 when there is none', () => {
    expect(
      newestRequesterMessageId([message(1), reply(2), message(5), reply(7), reply(8, { isInternal: true })]),
    ).toBe(5);
    expect(newestRequesterMessageId([reply(2)])).toBe(0);
    expect(newestRequesterMessageId([])).toBe(0);
  });
});

describe('mergeRow', () => {
  it('lays the new row over the old one and keeps the thread’s own fields', () => {
    const old = detail([message(1)], { priority: 'normal' });
    const merged = mergeRow(old, row({ priority: 'high', updatedAt: '2026-11-15T10:30:00.000Z' }));
    expect(merged).toMatchObject({ priority: 'high', messages: [{ id: 1 }], replyChannels: ['email'] });
  });

  it('ignores a row older than the one held, and a row of another ticket', () => {
    const old = row({ updatedAt: '2026-11-15T10:00:00.000Z', priority: 'high' });
    expect(mergeRow(old, row({ updatedAt: '2026-11-15T09:59:59.000Z', priority: 'low' }))).toBe(old);
    expect(mergeRow(old, row({ id: 11, priority: 'low' }))).toBe(old);
  });

  it('keeps the higher seen mark of each side, with its time', () => {
    const old = row({
      staffSeenMessageId: 8,
      staffSeenAt: 'A',
      requesterSeenMessageId: 2,
      requesterSeenAt: 'B',
    });
    const merged = mergeRow(
      old,
      row({
        staffSeenMessageId: 5,
        staffSeenAt: 'C',
        requesterSeenMessageId: 4,
        requesterSeenAt: 'D',
        updatedAt: '2026-11-15T10:01:00.000Z',
      }),
    );
    expect(merged).toMatchObject({
      staffSeenMessageId: 8,
      staffSeenAt: 'A',
      requesterSeenMessageId: 4,
      requesterSeenAt: 'D',
    });
  });
});

describe('applyRead', () => {
  it('moves the requester’s mark or the team’s forward, and never back', () => {
    const base = row({ requesterSeenMessageId: 4, requesterSeenAt: 'old', staffSeenMessageId: 6 });
    expect(applyRead(base, read({ by: 'requester', upToMessageId: 9, at: 'new' }))).toMatchObject({
      requesterSeenMessageId: 9,
      requesterSeenAt: 'new',
    });
    expect(applyRead(base, read({ by: 'requester', upToMessageId: 4 }))).toBe(base);
    expect(applyRead(base, read({ by: 'requester', upToMessageId: 1 }))).toBe(base);
    expect(applyRead(base, read({ by: 'staff', upToMessageId: 7, at: 'later' }))).toMatchObject({
      staffSeenMessageId: 7,
      staffSeenAt: 'later',
    });
    expect(applyRead(base, read({ by: 'staff', upToMessageId: 6 }))).toBe(base);
  });

  it('ignores a mark of another ticket', () => {
    const base = row();
    expect(applyRead(base, read({ ticketId: 11 }))).toBe(base);
  });
});

describe('the patches on a query client', () => {
  function client(): QueryClient {
    const queryClient = new QueryClient();
    queryClient.setQueryData<ListCache>([...TICKET_LISTS_KEY, { page: 1 }], {
      data: [row({ id: 10 }), row({ id: 11, number: 'T-11' })],
      total: 2,
    });
    queryClient.setQueryData<ListCache>([...TICKET_LISTS_KEY, { page: 2 }], {
      data: [row({ id: 12, number: 'T-12' })],
      total: 1,
    });
    queryClient.setQueryData<DetailCache>([...ticketDetailKey(10), { meta: 1 }], {
      data: detail([message(1)]),
    });
    return queryClient;
  }

  it('puts a message on the cached thread of its ticket, once', () => {
    const queryClient = client();
    expect(patchDetailWithMessage(queryClient, message(2))).toBe(true);
    expect(patchDetailWithMessage(queryClient, message(2))).toBe(false);
    const [[, cached]] = queryClient.getQueriesData<DetailCache>({ queryKey: ticketDetailKey(10) });
    expect(cached?.data.messages.map((m) => m.id)).toEqual([1, 2]);
  });

  it('creates no thread that was not cached', () => {
    const queryClient = client();
    expect(patchDetailWithMessage(queryClient, message(2, { ticketId: 77 }))).toBe(false);
    expect(queryClient.getQueriesData({ queryKey: ticketDetailKey(77) })).toEqual([]);
  });

  it('replaces the row in every page that holds it, and says nothing changed for a ticket on no page', () => {
    const queryClient = client();
    const newer = '2026-11-15T10:30:00.000Z';
    expect(
      patchListsWithRow(queryClient, row({ id: 12, number: 'T-12', priority: 'high', updatedAt: newer })),
    ).toBe(true);
    expect(patchListsWithRow(queryClient, row({ id: 99, number: 'T-99', updatedAt: newer }))).toBe(false);
    expect(findCachedTicket(queryClient, 12)?.priority).toBe('high');
    expect(patchDetailWithRow(queryClient, row({ id: 10, priority: 'low', updatedAt: newer }))).toBe(true);
    expect(findCachedTicket(queryClient, 99)).toBeUndefined();
  });

  it('moves a seen mark on the pages and the thread, and recomputes the thread’s unread flag', () => {
    const queryClient = client();
    queryClient.setQueryData<DetailCache>(ticketDetailKey(10), {
      data: detail([message(1), message(4)], { hasUnread: true }),
    });
    expect(patchListsWithRead(queryClient, read({ ticketId: 11, upToMessageId: 6 }))).toBe(true);
    expect(patchListsWithRead(queryClient, read({ ticketId: 11, upToMessageId: 6 }))).toBe(false);
    expect(findCachedTicket(queryClient, 11)?.staffSeenMessageId).toBe(6);
    // A mark below the newest requester message leaves the thread unread; one at it clears it.
    patchDetailWithRead(queryClient, read({ upToMessageId: 1 }));
    expect(queryClient.getQueryData<DetailCache>(ticketDetailKey(10))?.data.hasUnread).toBe(true);
    patchDetailWithRead(queryClient, read({ upToMessageId: 4 }));
    expect(queryClient.getQueryData<DetailCache>(ticketDetailKey(10))?.data.hasUnread).toBe(false);
  });

  it('clears the dot of a ticket on the pages', () => {
    const queryClient = client();
    expect(patchListsAsSeen(queryClient, 10)).toBe(true);
    expect(patchListsAsSeen(queryClient, 10)).toBe(false);
    expect(findCachedTicket(queryClient, 10)?.hasUnread).toBe(false);
    expect(findCachedTicket(queryClient, 11)?.hasUnread).toBe(true);
  });
});
