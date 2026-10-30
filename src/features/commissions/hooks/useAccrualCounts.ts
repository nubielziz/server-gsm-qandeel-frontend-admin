// The three numbers on the status sub-filter: ready, approved and all accruals. Each is the list call with `_start=0&_end=1`, read
// from `x-total-count`, so the server does the counting. Ports `cnt` of accrualsTab in 46-p-commissions.js.
import { useQueries } from '@tanstack/react-query';
import { listAccruals } from '../api';
import type { AccrualListFilters } from '../types';
import { COUNTS_KEY } from './keys';

/** The counts above the accruals table. A count is undefined until the server has answered. */
export type AccrualCounts = {
  ready: number | undefined;
  approved: number | undefined;
  all: number | undefined;
};

type CountSpec = { id: keyof AccrualCounts; filters: AccrualListFilters };

// The demo counted over all agents whatever the agent filter said.
const SPECS: readonly CountSpec[] = [
  { id: 'ready', filters: { status: 'accrued' } },
  { id: 'approved', filters: { status: 'approved' } },
  { id: 'all', filters: {} },
];

/** `enabled` is false until the staff member's permissions are known. */
export function useAccrualCounts(enabled = true): AccrualCounts {
  const results = useQueries({
    queries: SPECS.map((spec) => ({
      queryKey: [...COUNTS_KEY, spec.id],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (await listAccruals({ start: 0, end: 1, filters: spec.filters }, { signal })).total,
      enabled,
    })),
  });
  return { ready: results[0]?.data, approved: results[1]?.data, all: results[2]?.data };
}
