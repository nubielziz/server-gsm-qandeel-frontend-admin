// The open tab, kept in the address (`?tab=landing`). A tab change starts the new tab clean: the search text and page of one tab
// mean nothing to another, so they are dropped. Every tab is written, the default one too: a list tab keeps its search, page and sort
// in the same address, and an address with those and no tab would read as one of the old listing links.
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { DEFAULT_TAB, isStorefrontTab, type StorefrontTab } from '../lib/tabs';

/** The open tab, and a function that opens another one (dropping the old tab's search and page). */
export function useTabView() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: StorefrontTab = isStorefrontTab(raw) ? raw : DEFAULT_TAB;

  /** Opens a tab. A new history entry is added, so Back returns to the tab the staff member came from. */
  const setTab = useCallback((next: StorefrontTab) => setParams({ tab: next }), [setParams]);

  return { tab, setTab };
}

/**
 * Writes the tab the page shows into the address when the address does not name it (a bare `/storefront`, an unknown tab, a tab
 * the role may not open). The entry is replaced, so Back does not land on the unnamed address. `open` is undefined when there is
 * no tab to show.
 */
export function usePinTab(open: StorefrontTab | undefined) {
  const [params, setParams] = useSearchParams();
  const missing = open !== undefined && params.get('tab') !== open;
  useEffect(() => {
    if (!missing || open === undefined) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', open);
        return next;
      },
      { replace: true },
    );
  }, [missing, open, setParams]);
}
