// Tests for the run of a Save button of a form that stays open: how a result reads, pending while it runs, a second run ignored, "Saved"
// that clears itself, and the failure text for a refusal, a text result and a throw.
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { outcomeOf, SAVED_MS, useSaveFlow } from './useSaveFlow';

afterEach(() => vi.useRealTimers());

describe('outcomeOf', () => {
  it('reads false as not saved, with nothing to say', () => {
    expect(outcomeOf(false)).toEqual({ saved: false, message: null });
  });

  it('reads a text as not saved, with that text', () => {
    expect(outcomeOf('Below the floor.')).toEqual({ saved: false, message: 'Below the floor.' });
  });

  it('reads true, nothing and any other value as saved', () => {
    expect(outcomeOf(true)).toEqual({ saved: true });
    expect(outcomeOf(undefined)).toEqual({ saved: true });
    expect(outcomeOf({})).toEqual({ saved: true });
  });
});

describe('useSaveFlow', () => {
  it('is pending while the save runs and ignores a second run until it ends', async () => {
    const { result } = renderHook(() => useSaveFlow());
    let release: (value: unknown) => void = () => undefined;
    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.run(() => new Promise((resolve) => (release = resolve)));
    });
    expect(result.current.pending).toBe(true);

    const again = vi.fn(async () => true);
    await act(async () => {
      await result.current.run(again);
    });
    expect(again).not.toHaveBeenCalled();

    await act(async () => {
      release(true);
      await first;
    });
    expect(result.current.pending).toBe(false);
    expect(result.current.saved).toBe(true);
    expect(result.current.failure).toBeNull();
  });

  it('keeps a text result as the failure line', async () => {
    const { result } = renderHook(() => useSaveFlow());
    await act(async () => {
      await result.current.run(async () => 'The server said no.');
    });
    expect(result.current.saved).toBe(false);
    expect(result.current.failure).toBe('The server said no.');
  });

  it('says nothing for false: the fields show what is wrong', async () => {
    const { result } = renderHook(() => useSaveFlow());
    await act(async () => {
      await result.current.run(async () => false);
    });
    expect(result.current.saved).toBe(false);
    expect(result.current.failure).toBeNull();
  });

  it('turns a throw into the failure line, also an error that is not an Error', async () => {
    const { result } = renderHook(() => useSaveFlow());
    await act(async () => {
      await result.current.run(async () => {
        throw new Error('The connection dropped.');
      });
    });
    expect(result.current.saved).toBe(false);
    expect(result.current.failure).toBe('The connection dropped.');
    expect(result.current.pending).toBe(false);
    await act(async () => {
      await result.current.run(async () => {
        throw { detail: 'The server said no.' };
      });
    });
    expect(result.current.failure).toBe('The server said no.');
  });

  it('clears the failure when the next save starts, and "Saved" by itself after a few seconds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { result } = renderHook(() => useSaveFlow());
    await act(async () => {
      await result.current.run(async () => 'Not yet.');
    });
    expect(result.current.failure).toBe('Not yet.');
    await act(async () => {
      await result.current.run(async () => undefined);
    });
    expect(result.current.failure).toBeNull();
    expect(result.current.saved).toBe(true);
    act(() => {
      vi.advanceTimersByTime(SAVED_MS);
    });
    expect(result.current.saved).toBe(false);
  });
});
