// Tests for running an action over many orders one at a time: the loop, a failure in the middle, a signed-out session and the summary.
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { order } from '@/test/fixtures/orderRows';
import { ordersText, runBulk, summarize } from './bulk';

const refusal = (title: string) =>
  new ApiError({ status: 409, code: 'ORDER_NOT_OPEN', title, detail: `${title}.` });

describe('runBulk', () => {
  it('calls the step for each id in order, one after the other, and reports progress', async () => {
    const calls: number[] = [];
    const progress: [number, number][] = [];
    const outcome = await runBulk(
      [3, 1, 2],
      async (id) => {
        calls.push(id);
      },
      (done, total) => progress.push([done, total]),
    );
    expect(calls).toEqual([3, 1, 2]);
    expect(outcome).toEqual({ done: 3, failed: [] });
    expect(progress).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('records a failure with the server’s words and carries on', async () => {
    const step = vi.fn(async (id: number) => {
      if (id === 2) throw refusal('Order is closed');
    });
    const outcome = await runBulk([1, 2, 3], step);
    expect(step).toHaveBeenCalledTimes(3);
    expect(outcome.done).toBe(2);
    expect(outcome.failed).toEqual([{ id: 2, reason: 'Order is closed.' }]);
  });

  it('stops at a 401 and lists the orders it did not send', async () => {
    const step = vi.fn(async (id: number) => {
      if (id === 2) throw new ApiError({ status: 401, code: 'UNAUTHORIZED', title: 'Not signed in' });
    });
    const outcome = await runBulk([1, 2, 3, 4], step);
    expect(step).toHaveBeenCalledTimes(2);
    expect(outcome.done).toBe(1);
    expect(outcome.failed.map((failure) => failure.id)).toEqual([2, 3, 4]);
    expect(outcome.failed[1].reason).toMatch(/signed out/);
  });
});

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

  it('counts orders in words', () => {
    expect(ordersText(1)).toBe('1 order');
    expect(ordersText(12)).toBe('12 orders');
  });
});
