// Display preferences (theme, row density, the support inbox alerts and the notification bell's sound): their type, the React context and the storage helpers.
// Ports isDark/setTheme/setDense of 90-app.js; the theme and density keys match the inline script in index.html.
import { createContext, useContext } from 'react';

export type Theme = 'system' | 'light' | 'dark';

export type Preferences = {
  theme: Theme;
  /** True when the screen is dark right now: the chosen theme, or the system's when the theme is "system". */
  isDark: boolean;
  /** Compact table rows (32px instead of 40px). */
  dense: boolean;
  /** The notification bell's arrival chime (features/notifications/lib/chime.ts); on by default. */
  notificationSound: boolean;
  setTheme(theme: Theme): void;
  /** Flips between light and dark, like the topbar button; it leaves "system" for an explicit theme. */
  toggleTheme(): void;
  setDense(dense: boolean): void;
  /** Play a short sound when a customer or merchant writes to the support inbox (default on; feature 28). */
  supportSound: boolean;
  /** Show a desktop notification for the same while the tab is hidden (default off; feature 28). */
  desktopAlerts: boolean;
  setSupportSound(on: boolean): void;
  /**
   * Turns the desktop alerts on or off. Turning them on asks the browser; the answer is whether they are on afterwards (a browser that refuses or has
   * no notifications leaves them off).
   */
  setDesktopAlerts(on: boolean): Promise<boolean>;
  setNotificationSound(on: boolean): void;
};

export const PreferencesContext = createContext<Preferences | null>(null);

/** The display settings. Needs <PreferencesProvider> above it. */
export function usePreferences(): Preferences {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences needs <PreferencesProvider> above it.');
  return value;
}

// Same keys as the inline script in index.html, which applies them before first paint.
export const THEME_KEY = 'gsm-theme';
export const DENSE_KEY = 'gsm-dense';
export const SUPPORT_SOUND_KEY = 'gsm-support-sound';
export const SUPPORT_DESKTOP_KEY = 'gsm-support-desktop';
/** The bell's chime ("1" on, "0" off; nothing saved means on). Not read before first paint, so not in index.html. */
export const NOTIFICATION_SOUND_KEY = 'gsm-notification-sound';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

// localStorage can throw (blocked site data, private mode); preferences then last for the session only.
function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readTheme(): Theme {
  try {
    const saved = storage()?.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function readDense(): boolean {
  try {
    return storage()?.getItem(DENSE_KEY) === '1';
  } catch {
    return false;
  }
}

/** The alert sound is on unless the staff member switched it off. */
export function readSupportSound(): boolean {
  try {
    return storage()?.getItem(SUPPORT_SOUND_KEY) !== '0';
  } catch {
    return true;
  }
}

/** Desktop alerts are off unless the staff member switched them on (and the browser allowed them). */
export function readDesktopAlerts(): boolean {
  try {
    return storage()?.getItem(SUPPORT_DESKTOP_KEY) === '1';
  } catch {
    return false;
  }
}

/** "system" removes the saved choice, so the screen follows the operating system again. */
export function saveTheme(theme: Theme): void {
  try {
    if (theme === 'system') storage()?.removeItem(THEME_KEY);
    else storage()?.setItem(THEME_KEY, theme);
  } catch {
    // storage blocked: the choice still applies until the page is closed
  }
}

export function saveDense(dense: boolean): void {
  try {
    storage()?.setItem(DENSE_KEY, dense ? '1' : '0');
  } catch {
    // storage blocked: the choice still applies until the page is closed
  }
}

export function saveSupportSound(on: boolean): void {
  try {
    storage()?.setItem(SUPPORT_SOUND_KEY, on ? '1' : '0');
  } catch {
    // storage blocked: the choice still applies until the page is closed
  }
}

/** This page's choice of the notification sound while storage refuses it (the chime reads the setting outside React). */
let notificationSoundSession: boolean | undefined;

/** True unless the staff member turned the notification sound off. The chime asks at each ring. */
export function readNotificationSound(): boolean {
  if (notificationSoundSession !== undefined) return notificationSoundSession;
  try {
    const saved = storage()?.getItem(NOTIFICATION_SOUND_KEY);
    if (saved === '0') return false;
    if (saved === '1') return true;
  } catch {
    // storage blocked: the default
  }
  return true;
}

export function saveNotificationSound(on: boolean): void {
  notificationSoundSession = on;
  try {
    const store = storage();
    if (store) {
      store.setItem(NOTIFICATION_SOUND_KEY, on ? '1' : '0');
      notificationSoundSession = undefined;
    }
  } catch {
    // storage blocked: the choice still applies until the page is closed
  }
}

export function saveDesktopAlerts(on: boolean): void {
  try {
    storage()?.setItem(SUPPORT_DESKTOP_KEY, on ? '1' : '0');
  } catch {
    // storage blocked: the choice still applies until the page is closed
  }
}

/**
 * Can this browser show desktop notifications for the console? `granted` is ready now, `denied` is blocked by the browser (only its settings change that),
 * `unsupported` has no Notification API. Asking is part of turning the switch on, never of loading the page.
 */
export type DesktopPermission = 'granted' | 'denied' | 'unsupported';

/** Reads the browser's permission, asking when it has not been asked yet. A prompt that is dismissed counts as `denied` (the switch stays off). */
export async function askDesktopPermission(): Promise<DesktopPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return (await Notification.requestPermission()) === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/** The theme lives on <html> as `data-theme`; no attribute means "follow the system" (see styles/index.css). */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/** Density is the `dense` class on <html>, which sets the table row height variable. */
export function applyDense(dense: boolean): void {
  document.documentElement.classList.toggle('dense', dense);
}
