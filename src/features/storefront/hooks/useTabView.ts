// The open tab, kept in the address (`?tab=help`). A tab change starts the new tab clean: the search text and page of one tab
// mean nothing to another, so they are dropped. The default tab has no parameter.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { DEFAULT_TAB, isStorefrontTab, type StorefrontTab } from '../lib/tabs';

/** The open tab, and a function that opens another one (dropping the old tab's search and page). */
export function useTabView() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: StorefrontTab = isStorefrontTab(raw) ? raw : DEFAULT_TAB;

  /** Opens a tab. A new history entry is added, so Back returns to the tab the staff member came from. */
  const setTab = useCallback(
    (next: StorefrontTab) => setParams(next === DEFAULT_TAB ? {} : { tab: next }),
    [setParams],
  );

  return { tab, setTab };
}
