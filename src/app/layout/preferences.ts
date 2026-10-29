// Display preferences (theme and row density): their type, the React context and the storage helpers.
// Ports isDark/setTheme/setDense of 90-app.js; the storage keys match the inline script in index.html.
import { createContext, useContext } from 'react';

export type Theme = 'system' | 'light' | 'dark';

export type Preferences = {
  theme: Theme;
  /** True when the screen is dark right now: the chosen theme, or the system's when the theme is "system". */
  isDark: boolean;
  /** Compact table rows (32px instead of 40px). */
  dense: boolean;
  setTheme(theme: Theme): void;
  /** Flips between light and dark, like the topbar button; it leaves "system" for an explicit theme. */
  toggleTheme(): void;
  setDense(dense: boolean): void;
};

export const PreferencesContext = createContext<Preferences | null>(null);

/** The theme and density settings. Needs <PreferencesProvider> above it. */
export function usePreferences(): Preferences {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences needs <PreferencesProvider> above it.');
  return value;
}

// Same keys as the inline script in index.html, which applies them before first paint.
export const THEME_KEY = 'gsm-theme';
export const DENSE_KEY = 'gsm-dense';
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
