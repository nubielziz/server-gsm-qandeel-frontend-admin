// Tests for the display preferences: reading what was saved, saving choices, the system theme and blocked storage; and the two support alert switches
// (sound on by default, desktop off by default, and turning desktop on asks the browser).
import { act, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from './PreferencesProvider';
import { readNotificationSound, usePreferences } from './preferences';

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

  it('has the support sound on and the desktop alerts off until the staff member chooses', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current).toMatchObject({ supportSound: true, desktopAlerts: false });
    localStorage.setItem('gsm-support-sound', '0');
    localStorage.setItem('gsm-support-desktop', '1');
    const saved = renderHook(() => usePreferences(), { wrapper });
    expect(saved.result.current).toMatchObject({ supportSound: false, desktopAlerts: true });
  });

  it('saves the sound switch as 1 or 0', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => result.current.setSupportSound(false));
    expect(result.current.supportSound).toBe(false);
    expect(localStorage.getItem('gsm-support-sound')).toBe('0');
    act(() => result.current.setSupportSound(true));
    expect(localStorage.getItem('gsm-support-sound')).toBe('1');
  });

  describe('desktop alerts', () => {
    function fakeNotification(
      permission: NotificationPermission,
      answer: NotificationPermission = permission,
    ) {
      const request = vi.fn(() => Promise.resolve(answer));
      vi.stubGlobal('Notification', { permission, requestPermission: request });
      return request;
    }
    afterEach(() => vi.unstubAllGlobals());

    it('asks the browser when turned on, and is on only when it says yes', async () => {
      const request = fakeNotification('default', 'granted');
      const { result } = renderHook(() => usePreferences(), { wrapper });
      let on = false;
      await act(async () => {
        on = await result.current.setDesktopAlerts(true);
      });
      expect(request).toHaveBeenCalledTimes(1);
      expect(on).toBe(true);
      expect(result.current.desktopAlerts).toBe(true);
      expect(localStorage.getItem('gsm-support-desktop')).toBe('1');
    });

    it('stays off when the browser says no or has been blocked, and says so', async () => {
      const request = fakeNotification('default', 'denied');
      const { result } = renderHook(() => usePreferences(), { wrapper });
      await act(async () => expect(await result.current.setDesktopAlerts(true)).toBe(false));
      expect(request).toHaveBeenCalledTimes(1);
      expect(result.current.desktopAlerts).toBe(false);
      expect(localStorage.getItem('gsm-support-desktop')).toBe('0');

      fakeNotification('denied');
      await act(async () => expect(await result.current.setDesktopAlerts(true)).toBe(false));
      expect(result.current.desktopAlerts).toBe(false);
    });

    it('does not ask again when the browser already allowed it, and never asks to turn off', async () => {
      const request = fakeNotification('granted');
      const { result } = renderHook(() => usePreferences(), { wrapper });
      await act(async () => expect(await result.current.setDesktopAlerts(true)).toBe(true));
      await act(async () => expect(await result.current.setDesktopAlerts(false)).toBe(false));
      expect(request).not.toHaveBeenCalled();
      expect(result.current.desktopAlerts).toBe(false);
    });

    it('stays off in a browser with no notifications', async () => {
      vi.stubGlobal('Notification', undefined);
      const { result } = renderHook(() => usePreferences(), { wrapper });
      await act(async () => expect(await result.current.setDesktopAlerts(true)).toBe(false));
      expect(result.current.desktopAlerts).toBe(false);
    });
  });

  it('follows a switch another tab of the browser changed', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => {
      localStorage.setItem('gsm-support-sound', '0');
      window.dispatchEvent(new StorageEvent('storage', { key: 'gsm-support-sound', newValue: '0' }));
    });
    expect(result.current.supportSound).toBe(false);
    act(() => {
      localStorage.setItem('gsm-support-desktop', '1');
      window.dispatchEvent(new StorageEvent('storage', { key: 'gsm-support-desktop', newValue: '1' }));
    });
    expect(result.current.desktopAlerts).toBe(true);
  });

  it('has the notification sound on by default, saves it as 1 or 0, and the chime reads the same', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.notificationSound).toBe(true);
    expect(readNotificationSound()).toBe(true);
    act(() => result.current.setNotificationSound(false));
    expect(result.current.notificationSound).toBe(false);
    expect(localStorage.getItem('gsm-notification-sound')).toBe('0');
    expect(readNotificationSound()).toBe(false);
    act(() => result.current.setNotificationSound(true));
    expect(localStorage.getItem('gsm-notification-sound')).toBe('1');
    expect(readNotificationSound()).toBe(true);
  });

  it('reads a saved "off" for the notification sound', () => {
    localStorage.setItem('gsm-notification-sound', '0');
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.notificationSound).toBe(false);
  });

  it('keeps the notification sound off for the page when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.notificationSound).toBe(true);
    act(() => result.current.setNotificationSound(false));
    expect(result.current.notificationSound).toBe(false);
    expect(readNotificationSound()).toBe(false);
    act(() => result.current.setNotificationSound(true));
    expect(readNotificationSound()).toBe(true);
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
