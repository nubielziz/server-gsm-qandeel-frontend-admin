// The blocklist as Refine reads: one page of the entries for the tab, and the count on the tab. Ports the data side of
// `tabBlock` and the Blocklist tab count in 54-p-risk.js.
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import { useApiQuery } from '@/lib/query';
import { listBlocklist } from '../api';
import { toRefineFilters } from '../lib/view';
import type { BlocklistEntry, BlocklistFilters } from '../types';
import { BLOCK_COUNT_KEY } from './keys';

export type BlocklistArgs = {
  filters: BlocklistFilters;
  page: number;
  pageSize: number;
  sort: SortState;
};

/** `entries` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function useBlocklistList({ filters, page, pageSize, sort }: BlocklistArgs) {
  const { result, query } = useList<BlocklistEntry>({
    resource: 'blocklist',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: toRefineFilters({ ...filters }),
    errorNotification: false,
  });
  return { entries: result.data, total: result.total, query };
}

/** How many entries the blocklist has, whatever the filter: the number on the tab. */
export function useBlocklistCount() {
  return useApiQuery({
    queryKey: BLOCK_COUNT_KEY,
    queryFn: async ({ signal }) => (await listBlocklist({ start: 0, end: 1 }, { signal })).total,
  });
}
