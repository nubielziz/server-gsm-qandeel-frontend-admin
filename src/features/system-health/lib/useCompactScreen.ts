// A screen-size hook for ResponsiveTable: true below the `md` breakpoint (768px), where tables become stacked cards.
import { useSyncExternalStore } from 'react';

// Just under Tailwind's `md` (min-width: 768px). It is written as a max-width query on purpose: jsdom's stand-in never
// matches, so tests get the desktop table unless they stub matchMedia.
const COMPACT_QUERY = '(max-width: 767.98px)';

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia?.(COMPACT_QUERY);
  list?.addEventListener('change', onChange);
  return () => list?.removeEventListener('change', onChange);
}

function snapshot(): boolean {
  return window.matchMedia?.(COMPACT_QUERY).matches ?? false;
}

/** True on a phone-sized screen. It follows the window, so rotating a tablet swaps table and cards at once. */
export function useCompactScreen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
