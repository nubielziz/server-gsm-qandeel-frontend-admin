// Tests for the sequential runner: the loop, a failure in the middle, a signed-out session, string ids and progress.
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { runSequential, SIGNED_OUT_REASON } from './runSequential';

const refusal = (title: string) =>
  new ApiError({ status: 409, code: 'NOT_OPEN', title, detail: `${title}.` });

describe('runSequential', () => {
  it('calls the step for each id in order, one after the other, and reports progress', async () => {
    const calls: number[] = [];
    const progress: [number, number][] = [];
    const outcome = await runSequential(
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

  it('never has two calls in flight at once', async () => {
    let running = 0;
    let most = 0;
    await runSequential([1, 2, 3, 4], async () => {
      running += 1;
      most = Math.max(most, running);
      await Promise.resolve();
      running -= 1;
    });
    expect(most).toBe(1);
  });

  it('records a failure with the server’s words and carries on', async () => {
    const step = vi.fn(async (id: number) => {
      if (id === 2) throw refusal('Record is closed');
    });
    const outcome = await runSequential([1, 2, 3], step);
    expect(step).toHaveBeenCalledTimes(3);
    expect(outcome.done).toBe(2);
    expect(outcome.failed).toEqual([{ id: 2, reason: 'Record is closed.' }]);
  });

  it('turns an error that is not an ApiError into its message and carries on', async () => {
    const outcome = await runSequential([1, 2], async (id) => {
      if (id === 1) throw new Error('Moved, but not sent');
    });
    expect(outcome).toEqual({ done: 1, failed: [{ id: 1, reason: 'Moved, but not sent' }] });
  });

  it('stops at a 401 and lists the ids it did not send', async () => {
    const step = vi.fn(async (id: number) => {
      if (id === 2) throw new ApiError({ status: 401, code: 'UNAUTHORIZED', title: 'Not signed in' });
    });
    const progress: [number, number][] = [];
    const outcome = await runSequential([1, 2, 3, 4], step, (done, total) => progress.push([done, total]));
    expect(step).toHaveBeenCalledTimes(2);
    expect(outcome.done).toBe(1);
    expect(outcome.failed.map((failure) => failure.id)).toEqual([2, 3, 4]);
    expect(outcome.failed[1].reason).toBe(SIGNED_OUT_REASON);
    expect(outcome.failed[1].reason).toMatch(/signed out/);
    expect(progress.at(-1)).toEqual([4, 4]);
  });

  it('works with string ids', async () => {
    const outcome = await runSequential(['a', 'b'], async (id) => {
      if (id === 'b') throw refusal('Nope');
    });
    expect(outcome).toEqual({ done: 1, failed: [{ id: 'b', reason: 'Nope.' }] });
  });

  it('answers at once for an empty list', async () => {
    const step = vi.fn(async () => {});
    const progress: [number, number][] = [];
    const outcome = await runSequential<number>([], step, (done, total) => progress.push([done, total]));
    expect(step).not.toHaveBeenCalled();
    expect(outcome).toEqual({ done: 0, failed: [] });
    expect(progress).toEqual([[0, 0]]);
  });
});
