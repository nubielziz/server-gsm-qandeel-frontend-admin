// The table's keyboard shortcuts: j and k move the highlighted row, x ticks it and Enter opens it. Ports the keydown
// handler at the end of 41-p-orders.js. They stay silent while typing, with a dialog open (the drawer is one), or with a
// modifier held, so they never fight the console-wide shortcuts.
import { useEffect, useRef } from 'react';

export type OrderShortcuts = {
  /** Ids of the rows on this page, top to bottom. */
  ids: readonly number[];
  cursor: number | null;
  setCursor: (id: number) => void;
  open: (id: number) => void;
  toggle: (id: number) => void;
};

export function useOrderShortcuts(shortcuts: OrderShortcuts): void {
  // Read through a ref so the listener is added once, not on every render.
  const latest = useRef(shortcuts);
  useEffect(() => {
    latest.current = shortcuts;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target?.tagName ?? '') || target?.isContentEditable) return;
      if (document.querySelector('dialog[open]')) return;

      const { ids, cursor, setCursor, open, toggle } = latest.current;
      if (ids.length === 0) return;
      const at = cursor === null ? -1 : ids.indexOf(cursor);

      if (event.key === 'j') {
        event.preventDefault();
        setCursor(ids[Math.min(ids.length - 1, at + 1)]);
      } else if (event.key === 'k') {
        event.preventDefault();
        setCursor(ids[Math.max(0, at < 0 ? 0 : at - 1)]);
      } else if (event.key === 'Enter' && at >= 0) {
        event.preventDefault();
        open(ids[at]);
      } else if (event.key === 'x' && at >= 0) {
        event.preventDefault();
        toggle(ids[at]);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
