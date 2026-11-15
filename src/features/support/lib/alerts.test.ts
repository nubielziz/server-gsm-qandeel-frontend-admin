// Tests for the alert rules: who is alerted for whose ticket, what a freshly opened ticket looks like, and the words of the desktop notification.
import { describe, expect, it } from 'vitest';
import { row } from '../test/fixtures';
import { alertText, isFreshTicket, NEW_TICKET_WINDOW_MS, wantsAlert } from './alerts';

describe('wantsAlert', () => {
  it('alerts for a ticket nobody has and for one assigned to me, not for a colleague’s', () => {
    expect(wantsAlert({ assigneeId: null }, 1)).toBe(true);
    expect(wantsAlert({ assigneeId: 1 }, 1)).toBe(true);
    expect(wantsAlert({ assigneeId: 2 }, 1)).toBe(false);
  });

  it('alerts when the row is not known, and when I am not known yet only for an unassigned ticket', () => {
    expect(wantsAlert(null, 1)).toBe(true);
    expect(wantsAlert({ assigneeId: null }, undefined)).toBe(true);
    expect(wantsAlert({ assigneeId: 2 }, undefined)).toBe(false);
  });
});

describe('isFreshTicket', () => {
  const created = '2026-11-15T10:00:00.000Z';
  const at = Date.parse(created);
  const fresh = row({ status: 'new', createdAt: created, updatedAt: created });

  it('is true for a new ticket opened a moment ago that nobody has touched', () => {
    expect(isFreshTicket(fresh, at + 1_000)).toBe(true);
  });

  it('is false once it is old, answered (not new), or changed after it was opened', () => {
    expect(isFreshTicket(fresh, at + NEW_TICKET_WINDOW_MS + 1)).toBe(false);
    expect(isFreshTicket({ ...fresh, status: 'open' }, at + 1_000)).toBe(false);
    expect(isFreshTicket({ ...fresh, updatedAt: '2026-11-15T10:00:05.000Z' }, at + 6_000)).toBe(false);
  });

  it('is false for a time it cannot read', () => {
    expect(isFreshTicket({ ...fresh, createdAt: 'never' }, at)).toBe(false);
  });
});

describe('alertText', () => {
  it('names the ticket and the requester, never the message', () => {
    expect(alertText(row({ number: 'T-1042' }))).toEqual({
      title: 'New message on T-1042',
      body: 'Victor Silva',
    });
  });

  it('says it generally when the ticket is not known', () => {
    expect(alertText(null)).toEqual({ title: 'New message on a support ticket', body: '' });
  });
});
