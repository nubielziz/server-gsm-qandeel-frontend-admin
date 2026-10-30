// Which tabs of the customers list the staff member may open, and which one is showing. The Data requests tab needs
// `customers:privacy`; a link to it for someone without that permission lands on All, and the address is corrected so the
// page, the sort and the page number all agree on one tab.
import { useEffect } from 'react';
import type { SortState } from '@/components/ui';
import {
  CUSTOMER_TABS,
  DEFAULT_TAB,
  defaultSort,
  type CustomerTab,
  type CustomerTabSpec,
} from '../lib/filters';
import type { CustomerGrants } from './useCustomerGrants';
import type { useCustomerView } from './useCustomerView';

type View = ReturnType<typeof useCustomerView>;

/**
 * `visible` are the tabs to draw, `tab` the one that is open, `sort` the sort for it. The address is only corrected once the
 * permissions are known, because until then a privileged person's link to Data requests would look like a forbidden one.
 */
export function useVisibleTabs(
  view: View,
  grants: CustomerGrants,
): { visible: CustomerTabSpec[]; tab: CustomerTab; sort: SortState } {
  const visible = CUSTOMER_TABS.filter((spec) => !spec.permission || grants.can(spec.permission));
  const wanted = view.filters.tab;
  const tab = visible.some((spec) => spec.id === wanted) ? wanted : DEFAULT_TAB;
  const { setFilters } = view;
  const correct = grants.ready && tab !== wanted;

  useEffect(() => {
    if (correct) setFilters({ tab });
  }, [correct, tab, setFilters]);

  // Until the address is corrected, the sort in it belongs to the tab the link asked for, not to the one showing.
  return { visible, tab, sort: tab === wanted ? view.sort : defaultSort(tab) };
}
