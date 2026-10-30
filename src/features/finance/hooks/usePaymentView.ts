// The Deposits tab's status sub-tab, page and sort, kept in the address (`?tab=payments&status=all&page=2`). Ports
// `ui.finance.payTab` and `ui.fp` (11-state.js). Changes replace the history entry, as on the other lists.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import {
  DEFAULT_PAYMENT_FILTER,
  PAYMENT_DEFAULT_SORT,
  PAYMENT_SORT_FIELDS,
  parsePaymentFilter,
  type PaymentFilter,
} from '../lib/paymentView';
import { parsePage, parseSort, withParams, writePage, writeSort } from '../lib/url';

export function usePaymentView() {
  const [params, setParams] = useSearchParams();
  const filter = parsePaymentFilter(params);
  const sort = useMemo(() => parseSort(params, PAYMENT_SORT_FIELDS, PAYMENT_DEFAULT_SORT), [params]);
  const page = parsePage(params);

  /** Picks a sub-tab and goes back to page 1; Pending is the default and leaves no trace in the address. */
  const setFilter = useCallback(
    (next: PaymentFilter) =>
      setParams(
        (prev) =>
          writePage(withParams(prev, { status: next === DEFAULT_PAYMENT_FILTER ? undefined : next }), 1),
        { replace: true },
      ),
    [setParams],
  );
  const setPage = useCallback(
    (next: number) => setParams((prev) => writePage(prev, next), { replace: true }),
    [setParams],
  );
  const setSort = useCallback(
    (next: SortState) =>
      setParams((prev) => writePage(writeSort(prev, next, PAYMENT_DEFAULT_SORT), 1), { replace: true }),
    [setParams],
  );
  return { filter, page, sort, setFilter, setPage, setSort };
}
