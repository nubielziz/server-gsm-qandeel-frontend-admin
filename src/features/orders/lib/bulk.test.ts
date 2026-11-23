// Tests for the orders words of a bulk run: naming the refused orders like the table, and counting orders. The loop is tested in src/lib/bulk.
import { describe, expect, it } from 'vitest';
import { order } from '@/test/fixtures/orderRows';
import { ordersText, summarize } from './bulk';

describe('summarize and ordersText', () => {
  it('names the failed orders like the table does', () => {
    const orders = [order({ id: 1 }), order({ id: 20490, channel: 'b2c' }), order({ id: 3 })];
    const summary = summarize('rejected', orders, {
      done: 2,
      failed: [{ id: 20490, reason: 'Order is closed.' }],
    });
    expect(summary).toEqual({
      verb: 'rejected',
      done: 2,
      total: 3,
      failed: [{ label: 'SF-20490', reason: 'Order is closed.' }],
    });
  });

  it('shows #id for a failed id that is not among the orders', () => {
    const summary = summarize('rejected', [order({ id: 1 })], {
      done: 0,
      failed: [{ id: 99, reason: 'Gone.' }],
    });
    expect(summary.failed).toEqual([{ label: '#99', reason: 'Gone.' }]);
  });

  it('counts orders in words', () => {
    expect(ordersText(1)).toBe('1 order');
    expect(ordersText(12)).toBe('12 orders');
  });
});
