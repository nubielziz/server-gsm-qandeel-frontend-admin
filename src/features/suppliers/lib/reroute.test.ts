// Tests for the reroute loop: one order at a time, a failure is recorded and the run goes on, a 401 stops it, and progress is told.
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { movedButNotSent, ordersText, runReroute } from './reroute';

const refusal = (detail: string) => new ApiError({ status: 409, code: 'REFUSED', title: 'Refused', detail });

describe('runReroute', () => {
  it('runs the steps in order, never two at once, and counts the ones that went through', async () => {
    const running = { now: 0, most: 0 };
    const seen: number[] = [];
    const outcome = await runReroute([1, 2, 3], async (id) => {
      running.now += 1;
      running.most = Math.max(running.most, running.now);
      await Promise.resolve();
      seen.push(id);
      running.now -= 1;
    });
    expect(outcome).toEqual({ done: 3, failed: [] });
    expect(seen).toEqual([1, 2, 3]);
    expect(running.most).toBe(1);
  });

  it('records a refusal with the server’s words and goes on with the rest', async () => {
    const outcome = await runReroute([1, 2, 3], async (id) => {
      if (id === 2) throw refusal('Not this one.');
    });
    expect(outcome).toEqual({ done: 2, failed: [{ id: 2, reason: 'Not this one.' }] });
  });

  it('stops at a 401 and lists the orders that were not tried as not sent', async () => {
    const step = vi.fn(async (id: number) => {
      if (id === 2)
        throw new ApiError({ status: 401, code: 'UNAUTHORIZED', title: 'Not signed in', detail: 'Sign in.' });
    });
    const outcome = await runReroute([1, 2, 3, 4], step);
    expect(step).toHaveBeenCalledTimes(2);
    expect(outcome.done).toBe(1);
    expect(outcome.failed).toEqual([
      { id: 2, reason: 'Sign in.' },
      { id: 3, reason: 'Not sent: you were signed out.' },
      { id: 4, reason: 'Not sent: you were signed out.' },
    ]);
  });

  it('tells how far it is, from 0 to the total', async () => {
    const progress: [number, number][] = [];
    await runReroute(
      [1, 2],
      async () => {},
      (done, total) => progress.push([done, total]),
    );
    expect(progress).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
    ]);
  });
});

describe('words', () => {
  it('says the order moved when only the send failed', () => {
    const error = movedButNotSent('Nordic GSM', refusal('It does not take this service.'));
    expect(error.message).toBe('Moved to Nordic GSM, but not sent: It does not take this service.');
    expect(error.cause).toBeInstanceOf(ApiError);
  });

  it('counts orders', () => {
    expect([1, 3].map(ordersText)).toEqual(['1 order', '3 orders']);
  });
});
