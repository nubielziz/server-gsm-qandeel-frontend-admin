// The storefront payments report for the Payments tab: the method comparison and one page of the payments. Ports the data side
// of tabPayments (53-p-refunds.js).
import type { SortState } from '@/components/ui';
import { useApiQuery } from '@/lib/query';
import { getPaymentsReport } from '../api';
import type { PaymentMethod } from '../types';
import { REFRESH_MS, REPORT_KEY } from './keys';

export type PaymentsReportArgs = {
  /** The method filter; empty means all methods. */
  method: PaymentMethod | '';
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/** The report for a method, page and sort. The previous page stays on screen while the next one loads. */
export function usePaymentsReport({ method, page, pageSize, sort, enabled = true }: PaymentsReportArgs) {
  return useApiQuery({
    queryKey: [...REPORT_KEY, { method, page, pageSize, sort }],
    queryFn: ({ signal }) =>
      getPaymentsReport(
        {
          method: method || undefined,
          start: (page - 1) * pageSize,
          end: page * pageSize,
          sort: sort.field,
          order: sort.order,
        },
        { signal },
      ),
    enabled,
    refetchInterval: REFRESH_MS,
  });
}
