// The sales funnel for the Funnel panel. Needs `reports:growth`, so the page passes `enabled` and leaves the panel out without it.
import { useApiQuery } from '@/lib/query';
import { getFunnel } from '../api';
import type { FunnelDays } from '../types';
import { FUNNEL_KEY } from './keys';

const ONE_MINUTE = 60_000;

/** The counts of the last `days` days. The report is a total, not a live queue, so it is read again at most once a minute. */
export function useFunnel(days: FunnelDays, enabled: boolean) {
  return useApiQuery({
    queryKey: [...FUNNEL_KEY, days],
    queryFn: ({ signal }) => getFunnel({ days }, { signal }),
    enabled,
    staleTime: ONE_MINUTE,
  });
}
