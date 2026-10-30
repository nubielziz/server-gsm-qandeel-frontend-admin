// The numbers above the table: one count per tab, the "have an account" figure of the header, and the open data requests.
// Each is a list call with `_start=0&_end=1`, read from `x-total-count`, so the server does the counting. Ports the `cnt(...)`
// figures and the header sentence of pageCustomers (48-p-customers.js).
import { useQueries } from '@tanstack/react-query';
import { listCustomers, listDataRequests } from '../api';
import { requestFilters, tabFilters, toListQuery, type CustomerTab } from '../lib/filters';
import type { CustomerListFilters } from '../types';
import { CUSTOMER_COUNTS_KEY } from './keys';

export type CustomerCounts = {
  /** The customers of each tab; the Data requests tab counts the requests still to do. A count shows once its call has answered. */
  tabs: Partial<Record<CustomerTab, number>>;
  /** Customers who have an account (the header says how many of the rest checked out as guests). */
  withAccount: number | undefined;
};

type CountSpec = { id: string; load: (signal: AbortSignal) => Promise<number>; enabled: boolean };

// The demo counted over all customers whatever the toolbar said, so these calls carry no toolbar filter.
const COUNTED_TABS = ['all', 'active', 'flagged', 'suspended', 'blocked'] as const;

const customerCount = (filters: CustomerListFilters) => async (signal: AbortSignal) =>
  (await listCustomers(toListQuery(filters, { start: 0, end: 1 }), { signal })).total;

/**
 * `enabled` is false until the staff member's permissions are known; `privacy` (`customers:privacy`) turns the open-requests
 * count on, since the requests route needs it.
 */
export function useCustomerCounts({
  enabled,
  privacy,
}: {
  enabled: boolean;
  privacy: boolean;
}): CustomerCounts {
  const specs: CountSpec[] = [
    ...COUNTED_TABS.map((tab) => ({ id: tab, load: customerCount(tabFilters(tab)), enabled })),
    { id: 'withAccount', load: customerCount({ hasAccount: true }), enabled },
    {
      id: 'requests',
      load: async (signal) =>
        (await listDataRequests(toListQuery(requestFilters(''), { start: 0, end: 1 }), { signal })).total,
      enabled: enabled && privacy,
    },
  ];
  const results = useQueries({
    queries: specs.map((spec) => ({
      queryKey: [...CUSTOMER_COUNTS_KEY, spec.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => spec.load(signal),
      enabled: spec.enabled,
    })),
  });
  const countOf = (id: string): number | undefined =>
    results[specs.findIndex((spec) => spec.id === id)]?.data;

  const tabs: Partial<Record<CustomerTab, number>> = {};
  for (const id of [...COUNTED_TABS, 'requests'] as const) {
    const count = countOf(id);
    if (count !== undefined) tabs[id] = count;
  }
  return { tabs, withAccount: countOf('withAccount') };
}
