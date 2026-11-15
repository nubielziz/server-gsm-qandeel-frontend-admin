// PreferencesProvider: keeps the theme and row density in React state, on <html> and in localStorage, and the notification sound in state and storage.
// Ports setTheme/setDense of 90-app.js; decision 015 (no client-state library).
import { useCallback, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  applyDense,
  applyTheme,
  DARK_QUERY,
  PreferencesContext,
  readDense,
  readNotificationSound,
  readTheme,
  saveDense,
  saveNotificationSound,
  saveTheme,
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
    }),
    [theme, isDark, dense, notificationSound, setTheme, toggleTheme, setDense, setNotificationSound],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
