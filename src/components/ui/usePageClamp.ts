// usePageClamp: moves a paged list back to its last page when the list shrinks under the page being shown. Used next to
// `Pager` by every page that keeps its page number in the address.
import { useEffect } from 'react';

export type PageClampArgs = {
  page: number;
  pageSize: number;
  /** What the server counted for the whole list; undefined while unknown. */
  total: number | undefined;
  /** True only when `total` answers the current question (not placeholder data kept from the previous one). */
  settled: boolean;
  setPage: (page: number) => void;
};

/**
 * A bulk action, a refresh or an old `?page=9` link can leave the page past the end of the list. The table would then
 * show no rows, an empty state that is not true and no pager to get back. Once the count is known, this goes to the
 * last page that has rows (page 1 for an empty list).
 */
export function usePageClamp({ page, pageSize, total, settled, setPage }: PageClampArgs): void {
  const last = total === undefined ? undefined : Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (settled && last !== undefined && page > last) setPage(last);
  }, [settled, last, page, setPage]);
}
