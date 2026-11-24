// Tests for the state behind the dialog host: one dialog at a time, each opening numbered, nothing opened for no account, and the callback an
// opening may ask for once its dialog has closed.
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { account, guest } from '../../test/fixtures';
import { useAccountDialogs } from './useAccountDialogs';

describe('useAccountDialogs', () => {
  it('starts with nothing open, and opens the action for the accounts it is about', () => {
    const { result } = renderHook(() => useAccountDialogs());
    expect(result.current.request).toBeNull();
    act(() => result.current.open('suspend', [account(), guest()]));
    expect(result.current.request).toMatchObject({ action: 'suspend', opening: 1 });
    expect(result.current.request?.accounts).toHaveLength(2);
  });

  it('opens nothing for no account', () => {
    const { result } = renderHook(() => useAccountDialogs());
    act(() => result.current.open('suspend', []));
    expect(result.current.request).toBeNull();
  });

  it('closes, and numbers each opening, so a dialog mounted for it starts empty', () => {
    const { result } = renderHook(() => useAccountDialogs());
    act(() => result.current.open('adjust', [account()]));
    const first = result.current.request?.opening;
    act(() => result.current.close());
    expect(result.current.request).toBeNull();
    act(() => result.current.open('adjust', [account()]));
    expect(result.current.request?.opening).toBe((first ?? 0) + 1);
  });

  it('opening another action replaces the one that is open', () => {
    const { result } = renderHook(() => useAccountDialogs());
    act(() => result.current.open('adjust', [account()]));
    act(() => result.current.open('rank', [account()]));
    expect(result.current.request?.action).toBe('rank');
  });

  it('calls what the opening asked for once the dialog has closed, and only then', () => {
    const closed = vi.fn();
    const { result } = renderHook(() => useAccountDialogs());
    act(() => result.current.open('suspend', [account()], { onClosed: closed }));
    expect(closed).not.toHaveBeenCalled();
    act(() => result.current.close());
    expect(closed).toHaveBeenCalledTimes(1);
    // The next opening has no such callback.
    act(() => result.current.open('suspend', [account()]));
    act(() => result.current.close());
    expect(closed).toHaveBeenCalledTimes(1);
  });
});
