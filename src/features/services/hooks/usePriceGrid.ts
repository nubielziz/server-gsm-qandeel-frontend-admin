// One page of the price grid (`GET /admin/services/price-grid`): the figures of the Pricing view. The key starts with the shared catalog rows
// key, so every change that makes the services list stale (a price, a switch, a bulk change, a publish run) makes the grid read again too.
// The page before stays on screen while the next one loads, so a page change does not flash the table away.
import { keepPreviousData } from '@tanstack/react-query';
import type { ListQuery } from '@/lib/api';
import { SERVICE_ROWS_KEY, useApiQuery } from '@/lib/query';
import { listPriceGrid } from '../api';

/** The start of every price grid key. */
export const PRICE_GRID_KEY = [...SERVICE_ROWS_KEY, 'grid'] as const;

/**
 * The grid page for a request (see `gridQuery`). Needs `catalog:read` and `pricing:read`; pass `enabled: false` without them. `data` is
 * the page and its total; `isPlaceholderData` is true while the page before is kept on screen.
 */
export function usePriceGrid(query: ListQuery, enabled = true) {
  return useApiQuery({
    queryKey: [...PRICE_GRID_KEY, query],
    queryFn: ({ signal }) => listPriceGrid(query, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}
