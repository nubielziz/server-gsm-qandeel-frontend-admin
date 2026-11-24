// Tests for the parsers of the support events: a frame of the documented shape becomes a typed value, any other becomes null (it is skipped, never half used).
import { describe, expect, it } from 'vitest';
import { message, reply, row } from '../test/fixtures';
import {
  isRequesterMessage,
  parseMessage,
  parseMessageCreated,
  parseTicketRead,
  parseTicketRow,
  parseTicketUpdated,
} from './liveEvents';

describe('parseMessageCreated', () => {
  it('reads a message with its files, and whether it is live', () => {
    const frame = {
      ticketId: 10,
      message: message(5, { attachments: [{ id: 1, filename: 'a.pdf', mime: 'application/pdf', size: 3 }] }),
      live: true,
    };
    expect(parseMessageCreated(frame)).toMatchObject({ ticketId: 10, live: true, message: { id: 5 } });
    expect(parseMessageCreated({ ...frame, live: false })?.live).toBe(false);
    expect(parseMessageCreated({ ticketId: 10, message: message(5) })?.live).toBe(false);
  });

  it('reads a message that has no attachments key as one with none', () => {
    const { attachments: _attachments, ...bare } = message(5);
    expect(parseMessageCreated({ ticketId: 10, message: bare, live: true })?.message.attachments).toEqual([]);
  });

  it('skips a frame that is not the documented shape', () => {
    expect(parseMessageCreated(null)).toBeNull();
    expect(parseMessageCreated({ ticketId: 10 })).toBeNull();
    expect(parseMessageCreated({ ticketId: 11, message: message(5), live: true })).toBeNull();
    expect(parseMessageCreated({ ticketId: 10, message: { ...message(5), authorType: 'bot' } })).toBeNull();
    expect(
      parseMessageCreated({ ticketId: 10, message: { ...message(5), attachments: [{ id: 'x' }] } }),
    ).toBeNull();
    expect(parseMessageCreated({ ticketId: 'ten', message: message(5) })).toBeNull();
  });
});

describe('parseTicketRow and parseTicketUpdated', () => {
  it('reads a row and normalises the seen marks', () => {
    const { hasUnread: _h, requesterSeenMessageId: _r, ...partial } = row();
    const parsed = parseTicketUpdated({
      ticket: { ...partial, staffSeenMessageId: 7, staffSeenAt: '2026-11-15T10:00:00.000Z' },
    });
    expect(parsed?.ticket).toMatchObject({
      hasUnread: false,
      requesterSeenMessageId: null,
      staffSeenMessageId: 7,
    });
  });

  it('skips a row with an unknown status, a missing requester or a bad id', () => {
    expect(parseTicketRow({ ...row(), status: 'archived' })).toBeNull();
    expect(parseTicketRow({ ...row(), requester: undefined })).toBeNull();
    expect(parseTicketRow({ ...row(), id: 0 })).toBeNull();
    expect(parseTicketUpdated({})).toBeNull();
  });

  it('skips a row that names a requester type of the old model', () => {
    expect(parseTicketRow({ ...row(), requesterType: 'customer' })).toBeNull();
    expect(parseTicketRow({ ...row(), requesterType: 'client' })).toBeNull();
  });

  it('reads the rank kind of the requester, and an unknown or missing one as retail', () => {
    expect(
      parseTicketRow(row({ requester: { name: 'Zain', email: null, rankKind: 'merchant' } }))?.requester
        .rankKind,
    ).toBe('merchant');
    const bare = { ...row(), requester: { name: 'Zain', email: null } };
    expect(parseTicketRow(bare)?.requester.rankKind).toBe('retail');
    expect(
      parseTicketRow({ ...row(), requester: { name: 'Zain', email: null, rankKind: 'vip' } })?.requester
        .rankKind,
    ).toBe('retail');
  });
});

describe('parseTicketRead', () => {
  it('reads who marked what', () => {
    expect(
      parseTicketRead({ ticketId: 10, by: 'requester', upToMessageId: 4, at: '2026-11-15T10:00:00.000Z' }),
    ).toMatchObject({
      by: 'requester',
      upToMessageId: 4,
    });
  });

  it('skips a read by someone else, or without a message', () => {
    expect(parseTicketRead({ ticketId: 10, by: 'you', upToMessageId: 4, at: 'x' })).toBeNull();
    expect(parseTicketRead({ ticketId: 10, by: 'staff', at: 'x' })).toBeNull();
  });
});

describe('parseMessage and isRequesterMessage', () => {
  it('knows the requester’s account from the team and the system', () => {
    expect(isRequesterMessage(message(1))).toBe(true);
    expect(isRequesterMessage(message(1, { authorType: 'account', authorId: 5 }))).toBe(true);
    expect(isRequesterMessage(reply(2))).toBe(false);
    expect(isRequesterMessage(message(3, { authorType: 'system' }))).toBe(false);
    expect(parseMessage(reply(2))?.authorType).toBe('staff');
  });
});
