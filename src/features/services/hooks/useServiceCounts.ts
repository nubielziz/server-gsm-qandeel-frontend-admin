// The numbers above the Catalog table: the header's below-floor sentence and the chips (all, needs attention, not on the shop, switched off).
// Each is the list call with `_start=0&_end=1` read from `x-total-count` (the server counts), with its own `enabled` flag, so a figure the
// role may not ask for is never asked. Ports `all.length` and `below` of pageServices in 43-p-services.js.
import { useQueries } from '@tanstack/react-query';
import { listServices } from '../api';
import { CHIP_FILTERS, toListQuery } from '../lib/filters';
import type { ServiceListFilters } from '../types';
import { SERVICE_COUNTS_KEY } from './keys';

/** The figures the page header reads. A figure is undefined until the server has answered. */
export type ServiceCounts = {
  all: number | undefined;
  /** Active services whose price is under the floor, as the server counts them. */
  belowFloor: number | undefined;
};

/** The figure of each chip; undefined until the server has answered, or when the role may not ask. */
export type ChipCounts = {
  all: number | undefined;
  attention: number | undefined;
  notonshop: number | undefined;
  off: number | undefined;
};

type CountSpec = { id: string; filters: ServiceListFilters; enabled: boolean };

// The demo counted over all services whatever the toolbar said, and only active ones for the sentence. The chips do the same:
// their figures are global, so they equal the table only when no toolbar filter is on.
const ALL: ServiceListFilters = {};
const BELOW_FLOOR: ServiceListFilters = { belowFloor: true, status: 'active' };

/** One count per spec, each with its own flag; the key puts the shared rows key first, so a catalog change refreshes it. */
function useCounts(specs: readonly CountSpec[]): (number | undefined)[] {
  const results = useQueries({
    queries: specs.map((spec) => ({
      queryKey: [...SERVICE_COUNTS_KEY, spec.id],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (await listServices(toListQuery(spec.filters, { start: 0, end: 1 }), { signal })).total,
      enabled: spec.enabled,
    })),
  });
  return results.map((result) => result.data);
}

/** The header's figures. `enabled` is false until the staff member's permissions are known (and true only with `catalog:read`). */
export function useServiceCounts(enabled = true): ServiceCounts {
  const [all, belowFloor] = useCounts([
    { id: 'all', filters: ALL, enabled },
    { id: 'belowFloor', filters: BELOW_FLOOR, enabled },
  ]);
  return { all, belowFloor };
}

/**
 * The chips' figures. `catalog` is `catalog:read` (every chip needs it); `storefront` is `storefront:read`, without which the
 * server refuses the "Not on the shop" filter, so that count is not asked. "Needs attention" counts only the reasons the role may
 * see (the server narrows it). The "All" figure shares its request with the header's.
 */
export function useChipCounts({
  catalog,
  storefront,
}: {
  catalog: boolean;
  storefront: boolean;
}): ChipCounts {
  const [all, attention, notonshop, off] = useCounts([
    { id: 'all', filters: ALL, enabled: catalog },
    { id: 'attention', filters: CHIP_FILTERS.attention, enabled: catalog },
    { id: 'notonshop', filters: CHIP_FILTERS.notonshop, enabled: catalog && storefront },
    { id: 'off', filters: CHIP_FILTERS.off, enabled: catalog },
  ]);
  return { all, attention, notonshop, off };
}
