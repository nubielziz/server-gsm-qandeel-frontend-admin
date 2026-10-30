// The Finance page's open tab, kept in the address (`?tab=payments`), limited to the tabs the staff member may open. Ports
// `ui.finance.tab` (11-state.js); the Ledger is the default and leaves no `tab` parameter.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { resolveTab, visibleTabs, type FinanceTab } from '../lib/tabs';

/**
 * `tabs` are the tabs this staff member may open, `tab` the one showing (the first of them when the address names none
 * or one they may not open). Changing tab drops every other parameter: each tab has its own filters, page and open record.
 */
export function useFinanceTab(permissions: readonly string[]) {
  const [params, setParams] = useSearchParams();
  const tabs = useMemo(() => visibleTabs(permissions), [permissions]);
  const requested = params.get('tab');
  const tab = resolveTab(requested, tabs);

  const setTab = useCallback(
    (next: FinanceTab) => setParams(next === tabs[0]?.id ? new URLSearchParams() : { tab: next }),
    [setParams, tabs],
  );
  return { tab, tabs, setTab };
}
