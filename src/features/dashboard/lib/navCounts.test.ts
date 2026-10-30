// Tests for the sidebar counts: the mapping from the dashboard payload, zero counts left out, and the late dots.
import { describe, expect, it } from 'vitest';
import { NAV_COUNTS } from '../test/fixtures';
import { toNavCounts } from './navCounts';

describe('toNavCounts', () => {
  it('maps each page to its number and its late count', () => {
    expect(toNavCounts(NAV_COUNTS)).toEqual({
      orders: { count: 12, late: 3 },
      finance: { count: 2 },
      merchants: { count: 1 },
      support: { count: 7, late: 2, lateLabel: 'past the reply target' },
      refunds: { count: 5, late: 1, lateLabel: 'dispute deadlines within 3 days' },
      risk: { count: 4 },
    });
  });

  it('leaves out a page whose count is zero, and a late count of zero', () => {
    const counts = toNavCounts({
      orders: { open: 0, pastSla: 0 },
      finance: { pendingDeposits: 0 },
      merchants: { pendingApproval: 0 },
      support: { open: 3, late: 0 },
      refunds: { open: 0, disputesDueSoon: 0 },
      risk: { held: 0 },
    });
    expect(counts).toEqual({ support: { count: 3, lateLabel: 'past the reply target' } });
    expect(counts.support?.late).toBeUndefined();
  });
});
