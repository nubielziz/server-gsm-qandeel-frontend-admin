// Tests for useCompactScreen: false on a wide screen (and in jsdom's stand-in), true when the phone query matches.
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCompactScreen } from './useCompactScreen';

// A stand-in whose answer can be flipped, like the operating system or a rotated tablet changing the width.
function stubScreen(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return matches;
        },
        media: query,
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList,
  );
  return (value: boolean) => {
    matches = value;
    listeners.forEach((listener) => listener());
  };
}

afterEach(() => vi.restoreAllMocks());

describe('useCompactScreen', () => {
  it('is false when the screen is not narrow (the default stand-in never matches)', () => {
    const { result } = renderHook(() => useCompactScreen());
    expect(result.current).toBe(false);
  });

  it('is true when the phone query matches, and follows the window', () => {
    const setNarrow = stubScreen(true);
    const { result } = renderHook(() => useCompactScreen());
    expect(result.current).toBe(true);
    act(() => setNarrow(false));
    expect(result.current).toBe(false);
  });

  it('asks for a width just under the md breakpoint', () => {
    stubScreen(false);
    renderHook(() => useCompactScreen());
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767.98px)');
  });
});
