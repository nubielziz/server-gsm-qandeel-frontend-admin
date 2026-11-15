// Tests for the "Sent" / "Seen" line: it sits under the team's last public reply, notes and system lines have none, and a seen mark counts from that reply on.
import { describe, expect, it } from 'vitest';
import { message, reply } from '../test/fixtures';
import { receiptFor } from './receipt';

describe('receiptFor', () => {
  it('has none while the team has written nothing public', () => {
    expect(receiptFor([message(1)], null, null)).toBeNull();
    expect(receiptFor([message(1), reply(2, { isInternal: true })], 2, null)).toBeNull();
    expect(
      receiptFor([message(1), message(2, { authorType: 'system', isInternal: true })], null, null),
    ).toBeNull();
  });

  it('says Sent until the requester’s mark reaches the last public reply', () => {
    const thread = [message(1), reply(2), message(3), reply(4)];
    expect(receiptFor(thread, null, null)).toEqual({ messageId: 4, seen: false, text: 'Sent' });
    expect(receiptFor(thread, 2, '2026-11-15T10:05:00.000Z')).toMatchObject({
      messageId: 4,
      seen: false,
      text: 'Sent',
    });
  });

  it('says Seen with the time once the mark is at or past the reply, and just Seen without a time', () => {
    const thread = [message(1), reply(2)];
    const seen = receiptFor(thread, 2, '2026-11-15T10:05:00.000Z');
    expect(seen).toMatchObject({ messageId: 2, seen: true });
    expect(seen?.text).toMatch(/^Seen \d/);
    expect(receiptFor(thread, 9, null)).toMatchObject({ seen: true, text: 'Seen' });
  });

  it('puts the line under the reply, not under a note that came after it', () => {
    const thread = [message(1), reply(2), reply(3, { isInternal: true })];
    expect(receiptFor(thread, null, null)?.messageId).toBe(2);
  });
});
