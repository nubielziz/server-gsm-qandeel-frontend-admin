// Tests for the display preferences: reading what was saved, saving choices, the system theme and blocked storage.
import { act, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from './PreferencesProvider';
import { usePreferences } from './preferences';

function wrapper({ children }: { children: ReactNode }) {
  return <PreferencesProvider>{children}</PreferencesProvider>;
}

// A matchMedia whose "dark" answer can be flipped, to play the operating system changing its theme.
function fakeSystemTheme(dark: boolean) {
  let matches = dark;
  const listeners = new Set<() => void>();
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        media: query,
        get matches() {
          return matches;
        },
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
      }) as unknown as MediaQueryList,
  );
  return (next: boolean) => {
    matches = next;
    listeners.forEach((listener) => listener());
  };
}

afterEach(() => vi.restoreAllMocks());

describe('PreferencesProvider', () => {
  it('starts on the system theme with comfortable rows when nothing was saved', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current).toMatchObject({ theme: 'system', dense: false, isDark: false });
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(document.documentElement).not.toHaveClass('dense');
  });

  it('reads the saved theme and density and puts them on <html>', () => {
    localStorage.setItem('gsm-theme', 'dark');
    localStorage.setItem('gsm-dense', '1');
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current).toMatchObject({ theme: 'dark', dense: true, isDark: true });
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveClass('dense');
  });

  it('ignores a saved value it does not know', () => {
    localStorage.setItem('gsm-theme', 'purple');
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.theme).toBe('system');
  });

  it('saves a chosen theme, and "system" removes the saved choice', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => result.current.setTheme('light'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('gsm-theme')).toBe('light');
    act(() => result.current.setTheme('system'));
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(localStorage.getItem('gsm-theme')).toBeNull();
  });

  it('saves density as 1 or 0', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => result.current.setDense(true));
    expect(document.documentElement).toHaveClass('dense');
    expect(localStorage.getItem('gsm-dense')).toBe('1');
    act(() => result.current.setDense(false));
    expect(document.documentElement).not.toHaveClass('dense');
    expect(localStorage.getItem('gsm-dense')).toBe('0');
  });

  it('follows the operating system while the theme is "system", and toggling leaves system mode', () => {
    const setSystemDark = fakeSystemTheme(true);
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.isDark).toBe(true);

    act(() => setSystemDark(false));
    expect(result.current.isDark).toBe(false);

    act(() => setSystemDark(true));
    act(() => result.current.toggleTheme());
    expect(result.current).toMatchObject({ theme: 'light', isDark: false });
    // An explicit choice no longer follows the system.
    act(() => setSystemDark(false));
    act(() => result.current.toggleTheme());
    expect(result.current).toMatchObject({ theme: 'dark', isDark: true });
  });

  it('keeps working when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.theme).toBe('system');
    act(() => result.current.setTheme('dark'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(result.current.isDark).toBe(true);
  });

  it('refuses to be used without the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Lonely() {
      usePreferences();
      return null;
    }
    expect(() => render(<Lonely />)).toThrow(/PreferencesProvider/);
  });
});
