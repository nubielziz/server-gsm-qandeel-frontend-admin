// The Invoices tab's search, filters, page and sort, kept in the address (`?tab=invoices&status=open&q=…`). Changes replace
// the history entry, as on the other lists. New in the console (MISMATCHES M123).
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import {
  clearInvoiceFilters,
  INVOICE_DEFAULT_SORT,
  INVOICE_SORT_FIELDS,
  parseInvoiceFilters,
  writeInvoiceFilters,
  type InvoiceListState,
} from '../lib/invoiceView';
import { parsePage, parseSort, writePage, writeSort } from '../lib/url';

export function useInvoiceView() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseInvoiceFilters(params), [params]);
  const sort = useMemo(() => parseSort(params, INVOICE_SORT_FIELDS, INVOICE_DEFAULT_SORT), [params]);
  const page = parsePage(params);

  const setFilters = useCallback(
    (patch: Partial<InvoiceListState>) =>
      setParams((prev) => writePage(writeInvoiceFilters(prev, patch), 1), { replace: true }),
    [setParams],
  );
  const clearFilters = useCallback(
    () => setParams((prev) => clearInvoiceFilters(prev), { replace: true }),
    [setParams],
  );
  const setPage = useCallback(
    (next: number) => setParams((prev) => writePage(prev, next), { replace: true }),
    [setParams],
  );
  const setSort = useCallback(
    (next: SortState) =>
      setParams((prev) => writePage(writeSort(prev, next, INVOICE_DEFAULT_SORT), 1), { replace: true }),
    [setParams],
  );
  return { filters, page, sort, setFilters, clearFilters, setPage, setSort };
}
