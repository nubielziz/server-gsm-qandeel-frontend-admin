// The open tab of the System health page, kept in the address (`?tab=queues`). A tab the role cannot read, or one that does
// not exist, falls back to the first tab the role may see.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { isHealthTab, type HealthTabId } from '../lib/healthTabs';

/** Parameters that belong to the page, not to one tab, and so survive a change of tab. The rest are the old tab's own. */
const PAGE_PARAMS = ['range'];

/**
 * `[tab, setTab]`. `visible` lists the tab ids the staff member may see, in strip order. The first one is the default and
 * leaves no `tab` parameter. Changing tab drops the old tab's parameters (`view`, `queue`, `incident`…) and keeps the
 * range; choosing the tab that is already open changes nothing. Like the other pages, a change replaces the history
 * entry: Back should leave the page, not walk through every tab (the arrow keys select a tab at once). The tab is
 * undefined only when the role may see no tab at all.
 */
export function useHealthTab(
  visible: readonly HealthTabId[],
): [HealthTabId | undefined, (tab: HealthTabId) => void] {
  const [params, setParams] = useSearchParams();
  const asked = params.get('tab');
  const first: HealthTabId | undefined = visible[0];
  const tab = isHealthTab(asked) && visible.includes(asked) ? asked : first;
  const setTab = useCallback(
    (next: HealthTabId) => {
      if (next === tab) return;
      const updated = new URLSearchParams();
      for (const key of PAGE_PARAMS) {
        const value = params.get(key);
        if (value !== null) updated.set(key, value);
      }
      if (next !== first) updated.set('tab', next);
      setParams(updated, { replace: true });
    },
    [params, tab, first, setParams],
  );
  return [tab, setTab];
}
