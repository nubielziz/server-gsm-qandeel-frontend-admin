// What the single-services picker is looking at: the text typed in the search box (sent only when Search is pressed, as in the layout the
// owner asked for), the group, "only not imported yet", the page and the page size. The select-all box and the table read the same filter.
import { useState } from 'react';
import type { QuickAddGroupRef } from '../../../types';

/** The rows per page the picker starts with. */
export const PICKER_PAGE_SIZE = 25;

/** The sizes the picker's footer offers (the supplier's list sends at most 1,000 rows a call). */
export const PICKER_SIZES: readonly number[] = [10, 25, 50, 100];

/**
 * The picker's filter. `draft` is the text in the box and `q` the text last searched. Searching, changing the group or "only not imported"
 * goes back to the first page, and so does a new page size.
 */
export function useServicesFilter() {
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [onlyNew, setOnlyNewValue] = useState(false);
  const [group, setGroupValue] = useState<QuickAddGroupRef | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeValue] = useState(PICKER_PAGE_SIZE);
  return {
    draft,
    q,
    onlyNew,
    group,
    page,
    pageSize,
    setDraft,
    setPage,
    search: () => {
      setQ(draft.trim());
      setPage(1);
    },
    setOnlyNew: (value: boolean) => {
      setOnlyNewValue(value);
      setPage(1);
    },
    setGroup: (value: QuickAddGroupRef | undefined) => {
      setGroupValue(value);
      setPage(1);
    },
    setPageSize: (size: number) => {
      setPageSizeValue(size);
      setPage(1);
    },
    /** Back to an empty search on the first page (another supplier was chosen). */
    reset: () => {
      setDraft('');
      setQ('');
      setOnlyNewValue(false);
      setGroupValue(undefined);
      setPage(1);
    },
  };
}

/** The picker's filter, as `useServicesFilter` returns it. */
export type ServicesFilter = ReturnType<typeof useServicesFilter>;
