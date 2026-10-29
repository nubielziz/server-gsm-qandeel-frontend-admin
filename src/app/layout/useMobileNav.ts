// Open/close state of the off-canvas sidebar on small screens. Ports the nav-open and nav-close actions of 90-app.js.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

/**
 * Opening moves focus to the first sidebar link; Escape closes the menu and puts focus back on the menu button
 * (the demo had no Escape key here). A page change closes it too, however it happened (a link, the palette,
 * the browser's back button).
 */
export function useMobileNav() {
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Closing when the path changes is done while rendering (React's way to reset state on a changed value).
  const { pathname } = useLocation();
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setOpen(false);
  }

  const openNav = useCallback(() => setOpen(true), []);
  const closeNav = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    sidebarRef.current?.querySelector<HTMLElement>('a')?.focus();
    function onKeyDown(event: KeyboardEvent) {
      // An open dialog (the palette) owns Escape.
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      setOpen(false);
      menuButtonRef.current?.focus();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return { open, openNav, closeNav, sidebarRef, menuButtonRef };
}
