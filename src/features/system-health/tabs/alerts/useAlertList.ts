// The alerts the Alerts view lists for a filter choice. One read for most choices; "Open" is two reads (firing and
// acknowledged) joined, because the list API filters by one status at a time. Ports no demo page.
import type { HealthQuery } from '../../components';
import { FIRST_PAGE, PAGE_SIZE, useAlerts } from '../../hooks';
import { mergeOpenAlerts, singleFilter, type AlertChoice, type AlertPage } from './alertFilter';
import { pageRange } from './alertsView';

export interface AlertList {
  /** What a `HealthCard` reads: the page, the first-load, error and refetch states. */
  query: HealthQuery<AlertPage>;
  /** True when the rows answer the current filter and page, not rows kept from the previous one while it loads. */
  settled: boolean;
}

/**
 * The page of alerts for `choice`. A failed half of "Open" fails the whole list on the first load (a list without the
 * firing alerts must not look like "nothing is firing"); after that a failed refresh keeps the last rows and says "Stale".
 */
export function useAlertList(choice: AlertChoice, page: number): AlertList {
  const open = choice === 'open';
  const single = useAlerts(singleFilter(choice), pageRange(page, PAGE_SIZE), !open);
  const firing = useAlerts({ status: 'firing' }, FIRST_PAGE, open);
  const acknowledged = useAlerts({ status: 'acknowledged' }, FIRST_PAGE, open);

  if (!open) {
    return {
      query: {
        data: single.data ? { ...single.data, capped: false } : undefined,
        error: single.error,
        isPending: single.isPending,
        isError: single.isError,
        isFetching: single.isFetching,
        dataUpdatedAt: single.dataUpdatedAt,
        refetch: single.refetch,
      },
      settled: !single.isPlaceholderData,
    };
  }
  return {
    query: {
      data: firing.data && acknowledged.data ? mergeOpenAlerts(firing.data, acknowledged.data) : undefined,
      error: firing.error ?? acknowledged.error,
      isPending: firing.isPending || acknowledged.isPending,
      isError: firing.isError || acknowledged.isError,
      isFetching: firing.isFetching || acknowledged.isFetching,
      dataUpdatedAt: Math.min(firing.dataUpdatedAt, acknowledged.dataUpdatedAt),
      refetch: () => Promise.all([firing.refetch(), acknowledged.refetch()]),
    },
    settled: false,
  };
}
