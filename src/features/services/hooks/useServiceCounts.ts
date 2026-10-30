// The two numbers above the table: all services (the Services tab's count) and the active ones priced below their floor (the
// header sentence). Each is the list call with `_start=0&_end=1`, read from `x-total-count`, so the server does the counting and
// the floor test. Ports `all.length` and `below` of pageServices in 43-p-services.js.
import { useQueries } from '@tanstack/react-query';
import { listServices } from '../api';
import { toListQuery } from '../lib/filters';
import type { ServiceListFilters } from '../types';
import { SERVICE_COUNTS_KEY } from './keys';

/** The figures above the services table. A figure is undefined until the server has answered. */
export type ServiceCounts = {
  all: number | undefined;
  /** Active services whose price is under the floor, as the server counts them. */
  belowFloor: number | undefined;
};

type CountSpec = { id: keyof ServiceCounts; filters: ServiceListFilters };

// The demo counted over all services whatever the toolbar said, and only active ones for the sentence.
const SPECS: readonly CountSpec[] = [
  { id: 'all', filters: {} },
  { id: 'belowFloor', filters: { belowFloor: true, status: 'active' } },
];

/** `enabled` is false until the staff member's permissions are known (and true only with `catalog:read`). */
export function useServiceCounts(enabled = true): ServiceCounts {
  const results = useQueries({
    queries: SPECS.map((spec) => ({
      queryKey: [...SERVICE_COUNTS_KEY, spec.id],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (await listServices(toListQuery(spec.filters, { start: 0, end: 1 }), { signal })).total,
      enabled,
    })),
  });
  return { all: results[0]?.data, belowFloor: results[1]?.data };
}
