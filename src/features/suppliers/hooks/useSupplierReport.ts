// The supplier report (spend, rejection rate and speed over the last 7 days) that adds a line under the stats. It needs
// `reports:read`; without it the read is not made and the line is not drawn.
import { useApiQuery } from '@/lib/query';
import { getSupplierReport } from '../api';
import { SUPPLIER_REPORT_KEY } from './keys';

/** Days the report looks back: the demo's "7-day rate" for the runway. */
export const REPORT_DAYS = 7;

const ONE_MINUTE = 60_000;

/** All suppliers' rows in one call; the page picks the open supplier's. Pass `enabled: false` without `reports:read`. */
export function useSupplierReport(enabled: boolean) {
  return useApiQuery({
    queryKey: [...SUPPLIER_REPORT_KEY, REPORT_DAYS],
    queryFn: ({ signal }) => getSupplierReport({ days: REPORT_DAYS }, { signal }),
    enabled,
    staleTime: ONE_MINUTE,
  });
}
