// The open tab, kept in the address (`?tab=agents`). A tab change starts the new tab clean: the Accruals tab's filters mean nothing
// to the others, so they are dropped. The default tab has no parameter.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { DEFAULT_TAB, isCommissionsTab, type CommissionsTab } from '../lib/tabs';

/** The open tab, and a function that opens another one (dropping the old tab's filters). */
export function useCommissionTab() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: CommissionsTab = isCommissionsTab(raw) ? raw : DEFAULT_TAB;

  /** Opens a tab. A new history entry is added, so Back returns to the tab the staff member came from. */
  const setTab = useCallback(
    (next: CommissionsTab) => setParams(next === DEFAULT_TAB ? {} : { tab: next }),
    [setParams],
  );

  return { tab, setTab };
}
