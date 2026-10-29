// Keyboard shortcuts of the whole console. Ports the keydown handler of boot() in 90-app.js.
import { useEffect, useRef } from 'react';

/** "g then …" jumps: the key after `g` and the page it opens. Exactly the demo's map. */
export const GO_SHORTCUTS: Readonly<Record<string, string>> = {
  d: 'dashboard',
  o: 'orders',
  m: 'merchants',
  k: 'customers',
  s: 'support',
  i: 'risk',
  p: 'services',
  u: 'suppliers',
  t: 'storefront',
  f: 'finance',
  c: 'commissions',
  r: 'refunds',
  a: 'audit',
};

/** How long after `g` the next key still counts as the second half of the shortcut. */
export const GO_WINDOW_MS = 1200;

export type ShortcutHandlers = {
  /** ⌘K / Ctrl+K: opens the palette, or closes it when it is open. */
  togglePalette(): void;
  openPalette(): void;
  openShortcuts(): void;
  /** Opens the page with this resource name (`orders`). */
  goTo(page: string): void;
};

// Typing in a field must never trigger a shortcut (⌘K excepted, as in the demo).
function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(element?.tagName ?? '') || element?.isContentEditable === true;
}

/**
 * ⌘/Ctrl+K toggles the palette. When the user is not typing and no dialog is open: "/" focuses the page's search
 * field (`[data-fk]`) or opens the palette, "?" lists the shortcuts, and "g" then a letter opens a page.
 */
export function useGlobalShortcuts(handlers: ShortcutHandlers): void {
  // Read through a ref so the listener is added once, not on every render.
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    let goPressedAt = 0;

    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing) return;
      const { togglePalette, openPalette, openShortcuts, goTo } = latest.current;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        togglePalette();
        return;
      }
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector('dialog[open]')) return;

      if (event.key === '/') {
        event.preventDefault();
        const search = document.querySelector<HTMLElement>('[data-fk]');
        if (search) search.focus();
        else openPalette();
      } else if (event.key === '?') {
        event.preventDefault();
        openShortcuts();
      } else if (event.key === 'g') {
        goPressedAt = Date.now();
      } else if (goPressedAt && Date.now() - goPressedAt < GO_WINDOW_MS) {
        const page = GO_SHORTCUTS[event.key];
        if (page) {
          event.preventDefault();
          goTo(page);
        }
        goPressedAt = 0;
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
