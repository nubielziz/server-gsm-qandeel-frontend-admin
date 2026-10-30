// The numbers on the tabs: one count per status tab, the groups, and the verification requests waiting for a decision. Each is the
// list call with `_start=0&_end=1`, read from `x-total-count` (the same way the orders tabs count), so the server does the counting.
// Ports the `cnt(...)` figures of pageMerchants in 42-p-merchants.js.
import { useQueries } from '@tanstack/react-query';
import type { ApiInit, ListQuery, ListResult } from '@/lib/api';
import { listClientGroups, listClients, listKycSubmissions } from '../api';
import { MERCHANT_TABS, tabStatus, type MerchantTab } from '../lib/status';
import { MERCHANT_COUNTS_KEY, REFRESH_MS } from './keys';

/** The count of each tab that has one; a tab's count is missing until its call answers. */
export type MerchantCounts = Partial<Record<MerchantTab, number>>;

const ONE_ROW: ListQuery = { start: 0, end: 1 };

// What each tab counts. The demo counted over all merchants whatever the toolbar said, so these calls carry no toolbar filter.
function loaderOf(tab: MerchantTab): (init: ApiInit) => Promise<ListResult<unknown>> {
  if (tab === 'groups') return (init) => listClientGroups(ONE_ROW, init);
  if (tab === 'verification') {
    return (init) => listKycSubmissions({ ...ONE_ROW, filters: { status: 'pending' } }, init);
  }
  const status = tabStatus(tab);
  return (init) => listClients({ ...ONE_ROW, filters: status ? { status } : undefined }, init);
}

/** `can` decides which counts to ask for: a tab the staff member may not read has nothing to count. */
export function useMerchantCounts(can: (permission: string) => boolean): MerchantCounts {
  const results = useQueries({
    queries: MERCHANT_TABS.map((tab) => ({
      queryKey: [...MERCHANT_COUNTS_KEY, tab.id],
      queryFn: async ({ signal }: { signal: AbortSignal }) => (await loaderOf(tab.id)({ signal })).total,
      enabled: can(tab.permission),
      refetchInterval: REFRESH_MS,
    })),
  });
  const counts: MerchantCounts = {};
  MERCHANT_TABS.forEach((tab, index) => {
    const count = results[index]?.data;
    if (count !== undefined) counts[tab.id] = count;
  });
  return counts;
}
