// Tests for the throttle the live hooks use: the first call runs at once, calls inside the window become one run at its end, and a cancelled run never happens.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createThrottle } from './throttle';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createThrottle', () => {
  it('runs the first call at once', () => {
    const run = vi.fn();
    createThrottle(run, 5_000, Date.now).call();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('turns a burst inside the window into one run at the end of it', () => {
    const run = vi.fn();
    const throttle = createThrottle(run, 5_000, Date.now);
    for (let i = 0; i < 20; i += 1) throttle.call();
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(4_999);
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(60_000);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('runs again at once when a call comes after the window', () => {
    const run = vi.fn();
    const throttle = createThrottle(run, 5_000, Date.now);
    throttle.call();
    vi.advanceTimersByTime(5_001);
    throttle.call();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('never runs a cancelled call, and works again afterwards', () => {
    const run = vi.fn();
    const throttle = createThrottle(run, 5_000, Date.now);
    throttle.call();
    throttle.call();
    throttle.cancel();
    vi.advanceTimersByTime(10_000);
    expect(run).toHaveBeenCalledTimes(1);
    throttle.call();
    expect(run).toHaveBeenCalledTimes(2);
  });
});
