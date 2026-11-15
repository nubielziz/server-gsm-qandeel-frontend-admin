// PreferencesProvider: keeps the theme, row density, the support alerts and the notification sound in React state, on <html> and in localStorage.
// Ports setTheme/setDense of 90-app.js; decision 015 (no client-state library).
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  applyDense,
  applyTheme,
  askDesktopPermission,
  DARK_QUERY,
  PreferencesContext,
  readDense,
  readDesktopAlerts,
  readNotificationSound,
  readSupportSound,
  readTheme,
  saveDense,
  saveDesktopAlerts,
  saveNotificationSound,
  saveSupportSound,
  saveTheme,
  SUPPORT_DESKTOP_KEY,
  SUPPORT_SOUND_KEY,
  type Preferences,
  type Theme,
} from './preferences';

// The operating system's dark-mode setting as an external store, so "system" theme users see the icon follow it.
function subscribeSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

/**
 * Wrap the whole app (sign-in screens included). The saved choice is read once; <html> is kept in line with the
 * state, which the inline script in index.html already did before first paint, so nothing flashes.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [dense, setDenseState] = useState<boolean>(readDense);
  const [supportSound, setSupportSoundState] = useState<boolean>(readSupportSound);
  const [desktopAlerts, setDesktopAlertsState] = useState<boolean>(readDesktopAlerts);
  const [notificationSound, setNotificationSoundState] = useState<boolean>(readNotificationSound);
  const systemDark = useSyncExternalStore(subscribeSystemTheme, systemPrefersDark, () => false);
  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  useLayoutEffect(() => {
    applyTheme(theme);
    applyDense(dense);
  }, [theme, dense]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    saveTheme(next);
  }, []);
  const setDense = useCallback((next: boolean) => {
    setDenseState(next);
    saveDense(next);
  }, []);
  const setNotificationSound = useCallback((next: boolean) => {
    setNotificationSoundState(next);
    saveNotificationSound(next);
  }, []);
  const toggleTheme = useCallback(() => setTheme(isDark ? 'light' : 'dark'), [isDark, setTheme]);
  const setSupportSound = useCallback((next: boolean) => {
    setSupportSoundState(next);
    saveSupportSound(next);
  }, []);
  const setDesktopAlerts = useCallback(async (next: boolean) => {
    // Switching on asks the browser; only a "granted" answer turns it on, so the switch never says "on" for alerts that cannot show.
    const on = next && (await askDesktopPermission()) === 'granted';
    setDesktopAlertsState(on);
    saveDesktopAlerts(on);
    return on;
  }, []);

  // Another tab of this browser changed an alert switch: follow it, because the tab that holds the live stream is the one that alerts.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SUPPORT_SOUND_KEY) setSupportSoundState(readSupportSound());
      if (event.key === SUPPORT_DESKTOP_KEY) setDesktopAlertsState(readDesktopAlerts());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<Preferences>(
    () => ({
      theme,
      isDark,
      dense,
      notificationSound,
      setTheme,
      toggleTheme,
      setDense,
      setNotificationSound,
      supportSound,
      desktopAlerts,
      setSupportSound,
      setDesktopAlerts,
    }),
    [
      theme,
      isDark,
      dense,
      notificationSound,
      setTheme,
      toggleTheme,
      setDense,
      setNotificationSound,
      supportSound,
      desktopAlerts,
      setSupportSound,
      setDesktopAlerts,
    ],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
