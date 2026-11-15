// "Is the screen wide enough to show the list and the thread side by side" (the `lg` breakpoint, 1024 px). On a narrower screen the thread is on screen only while a ticket
// is open, which decides whether the team can be said to have seen it (feature 28, `useMarkRead`). Without `matchMedia` (a test, an old browser) it says no.
import { useSyncExternalStore } from 'react';

const WIDE_QUERY = '(min-width: 1024px)';

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia?.(WIDE_QUERY);
  query?.addEventListener?.('change', onChange);
  return () => query?.removeEventListener?.('change', onChange);
}

const wide = (): boolean => window.matchMedia?.(WIDE_QUERY).matches ?? false;

export function useWideScreen(): boolean {
  return useSyncExternalStore(subscribe, wide, () => false);
}
