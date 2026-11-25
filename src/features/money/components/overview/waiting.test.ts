// Tests for "Waiting for you" on the Money Overview: one row per queue with something in it, the words of each, the links, and the three
// states without rows (no queue for the role, nothing known yet, everything known is zero).
import { describe, expect, it } from 'vitest';
import { usableViews } from '../../lib/moneyViews';
import { waitingFor } from './waiting';

const OWNER = usableViews(['*']);

describe('waitingFor', () => {
  it('has a row for each queue with something in it, in the order deposits, refunds, disputes', () => {
    expect(waitingFor(OWNER, { deposits: 3, refunds: 2, disputes: 1 })).toEqual({
      state: 'rows',
      rows: [
        {
          view: 'deposits',
          count: 3,
          text: 'deposits to review',
          link: 'Open Deposits',
          to: '/money?view=deposits',
        },
        {
          view: 'refunds',
          count: 2,
          text: 'refunds to decide or retry',
          link: 'Open Refunds',
          to: '/money?view=refunds',
        },
        {
          view: 'disputes',
          count: 1,
          text: 'card dispute needs evidence',
          link: 'Open Card disputes',
          to: '/money?view=disputes',
        },
      ],
    });
  });

  it('says one of a kind in the singular and leaves out the queues that are zero or unknown', () => {
    const waiting = waitingFor(OWNER, { deposits: 1, refunds: 0 });
    expect(waiting.state === 'rows' && waiting.rows.map((row) => [row.view, row.text])).toEqual([
      ['deposits', 'deposit to review'],
    ]);
  });

  it('says nothing is waiting once a count is known and every known count is zero', () => {
    expect(waitingFor(OWNER, { deposits: 0, refunds: 0, disputes: 0 })).toEqual({ state: 'empty' });
    expect(waitingFor(OWNER, { deposits: 0 })).toEqual({ state: 'empty' });
  });

  it('is loading while no count is known', () => {
    expect(waitingFor(OWNER, {})).toEqual({ state: 'loading' });
  });

  it('lists only the queues the role may work', () => {
    const refundsOnly = waitingFor(usableViews(['refunds:read']), { deposits: 5, refunds: 2, disputes: 4 });
    expect(refundsOnly.state === 'rows' && refundsOnly.rows.map((row) => row.view)).toEqual(['refunds']);
  });

  it('has no panel for a role that may work no queue', () => {
    expect(waitingFor(usableViews(['ledger:read']), { deposits: 5 })).toEqual({ state: 'none' });
    expect(waitingFor([], {})).toEqual({ state: 'none' });
  });
});
