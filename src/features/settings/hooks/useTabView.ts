// The open tab, kept in the address (`?tab=tax`, the link the dashboard's "Refresh rates" uses). A tab change starts the new tab clean:
// the filters and the open drawer of one tab mean nothing to another, so they are dropped. The default tab has no parameter.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { DEFAULT_TAB, isSettingsTab, type SettingsTab } from '../lib/tabs';

/** The open tab, and a function that opens another one (dropping the old tab's filters). */
export function useTabView() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: SettingsTab = isSettingsTab(raw) ? raw : DEFAULT_TAB;

  /** Opens a tab. A new history entry is added, so Back returns to the tab the staff member came from. */
  const setTab = useCallback(
    (next: SettingsTab) => setParams(next === DEFAULT_TAB ? {} : { tab: next }),
    [setParams],
  );

  return { tab, setTab };
}
