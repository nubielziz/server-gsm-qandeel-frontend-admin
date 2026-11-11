// Tests for the inbox API functions: the method, path, query and body of the list, the unread count and the two read actions.
import { beforeEach, describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { capture } from '../test/capture';
import { inboxItem } from '../test/fixtures';
import { getUnreadCount, listInbox, markAllInboxRead, markInboxRead } from './inbox';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

describe('listInbox', () => {
  it('sends the range and the unread switch and reads the total from the header', async () => {
    const seen = capture('get', '/admin/inbox', { json: [inboxItem()], headers: { 'x-total-count': '31' } });
    const result = await listInbox({ start: 20, end: 40, unread: true });
    expect(seen[0]).toMatchObject({
      method: 'GET',
      path: '/admin/inbox',
      query: { _start: ['20'], _end: ['40'], unread: ['true'] },
    });
    expect(seen[0].query).not.toHaveProperty('locale');
    expect(result.total).toBe(31);
  });

  it('sends the category and the language when given, and no unread parameter when it is off', async () => {
    const seen = capture('get', '/admin/inbox', { json: [] });
    await listInbox({ category: 'order', locale: 'ar' });
    expect(seen[0].query).toEqual({ category: ['order'], locale: ['ar'] });
  });
});

describe('getUnreadCount', () => {
  it('reads the number the server capped at 100', async () => {
    const seen = capture('get', '/admin/inbox/unread-count', { json: { unread: 100 } });
    expect(await getUnreadCount()).toEqual({ unread: 100 });
    expect(seen[0]).toMatchObject({ method: 'GET', path: '/admin/inbox/unread-count' });
  });
});

describe('markInboxRead', () => {
  it('posts to the item and reads nothing from the 204', async () => {
    const seen = capture('post', '/admin/inbox/41/read', { status: 204 });
    await expect(markInboxRead(41)).resolves.toBeUndefined();
    expect(seen[0]).toMatchObject({ method: 'POST', path: '/admin/inbox/41/read', body: undefined });
  });
});

describe('markAllInboxRead', () => {
  it('sends the newest id the screen showed', async () => {
    const seen = capture('post', '/admin/inbox/read-all', { json: { updated: 3 } });
    expect(await markAllInboxRead({ upToId: 41 })).toEqual({ updated: 3 });
    expect(seen[0]).toMatchObject({ method: 'POST', path: '/admin/inbox/read-all', body: { upToId: 41 } });
  });

  it('sends an empty body to mark everything', async () => {
    const seen = capture('post', '/admin/inbox/read-all', { json: { updated: 5 } });
    await markAllInboxRead();
    expect(seen[0].body).toEqual({});
  });
});
