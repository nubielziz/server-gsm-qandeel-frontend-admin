// Tests for the sidebar counts: the mapping from the dashboard payload, zero counts left out, the late dots, and the one Money count that
// adds the pending deposits and the open refunds, each part only for a role that may use the view it leads to.
import { describe, expect, it } from 'vitest';
import { NAV_COUNTS } from '../test/fixtures';
import { toNavCounts } from './navCounts';

// The Owner: every part of the Money count is allowed.
const ALL = ['*'];

describe('toNavCounts', () => {
  it('maps each page to its number and its late count, with one Money count for the deposits and the refunds', () => {
    expect(toNavCounts(NAV_COUNTS, ALL)).toEqual({
      orders: { count: 12, late: 3 },
      support: { count: 7, late: 2, lateLabel: 'past the reply target' },
      // 2 deposits waiting + 5 open refunds; the red dot is the disputes whose evidence is due within 3 days.
      money: { count: 7, late: 1, lateLabel: 'dispute deadlines within 3 days' },
      risk: { count: 4 },
    });
    expect(toNavCounts(NAV_COUNTS, ALL)).not.toHaveProperty('finance');
    expect(toNavCounts(NAV_COUNTS, ALL)).not.toHaveProperty('refunds');
  });

  it('counts only the deposits when no refund is open, and only the refunds when no deposit waits', () => {
    const base = { ...NAV_COUNTS, refunds: { open: 0, disputesDueSoon: 0 } };
    expect(toNavCounts(base, ALL).money).toEqual({ count: 2, lateLabel: 'dispute deadlines within 3 days' });
    expect(toNavCounts(base, ALL).money?.late).toBeUndefined();
    const refundsOnly = { ...NAV_COUNTS, finance: { pendingDeposits: 0 } };
    expect(toNavCounts(refundsOnly, ALL).money).toEqual({
      count: 5,
      late: 1,
      lateLabel: 'dispute deadlines within 3 days',
    });
  });

  it('shows no Money count when nothing waits, even when a dispute deadline is near (the dot needs the number)', () => {
    const counts = toNavCounts(
      {
        ...NAV_COUNTS,
        finance: { pendingDeposits: 0 },
        refunds: { open: 0, disputesDueSoon: 2 },
      },
      ALL,
    );
    expect(counts.money).toBeUndefined();
  });

  it('leaves out a page whose count is zero, and a late count of zero', () => {
    const counts = toNavCounts(
      {
        orders: { open: 0, pastSla: 0 },
        finance: { pendingDeposits: 0 },
        support: { open: 3, late: 0 },
        refunds: { open: 0, disputesDueSoon: 0 },
        risk: { held: 0 },
      },
      ALL,
    );
    expect(counts).toEqual({ support: { count: 3, lateLabel: 'past the reply target' } });
    expect(counts.support?.late).toBeUndefined();
  });

  describe('the Money count follows the staff member’s permissions', () => {
    const LATE = 'dispute deadlines within 3 days';

    it('counts only the pending deposits with payments:read alone, and leaves the refunds and the dot out', () => {
      const money = toNavCounts(NAV_COUNTS, ['payments:read']).money;
      expect(money?.count).toBe(2);
      expect(money?.late).toBeUndefined();
    });

    it('counts only the open refunds with refunds:read alone, without the dispute dot', () => {
      const money = toNavCounts(NAV_COUNTS, ['refunds:read']).money;
      expect(money?.count).toBe(5);
      expect(money?.late).toBeUndefined();
    });

    it('adds the dispute dot only with disputes:read', () => {
      expect(toNavCounts(NAV_COUNTS, ['refunds:read', 'disputes:read']).money).toEqual({
        count: 5,
        late: 1,
        lateLabel: LATE,
      });
      expect(toNavCounts(NAV_COUNTS, ['payments:read', 'refunds:read']).money?.late).toBeUndefined();
    });

    it('adds the parts of a role that holds a whole area (payments:*, refunds:*)', () => {
      expect(toNavCounts(NAV_COUNTS, ['payments:*', 'refunds:*', 'disputes:*']).money).toEqual({
        count: 7,
        late: 1,
        lateLabel: LATE,
      });
    });

    it('shows no Money count at all when every part is left out, even with the dispute dot allowed', () => {
      expect(toNavCounts(NAV_COUNTS, ['ledger:read']).money).toBeUndefined();
      // A dot needs the number beside it: disputes:read alone has nothing to count.
      expect(toNavCounts(NAV_COUNTS, ['disputes:read']).money).toBeUndefined();
      expect(toNavCounts(NAV_COUNTS, [])).not.toHaveProperty('money');
    });

    it('leaves the other pages as they are', () => {
      expect(toNavCounts(NAV_COUNTS, [])).toEqual({
        orders: { count: 12, late: 3 },
        support: { count: 7, late: 2, lateLabel: 'past the reply target' },
        risk: { count: 4 },
      });
    });
  });
});
