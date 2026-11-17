// One publish run, followed while the server works on it: the preview being prepared, the publishing, a run switch. It is read again
// every 1.5 seconds while the run or its switch is working, and not once both have ended. When a run or a switch that this page saw
// working ends, the lists it changed are made stale (the listings, the counts, the dashboard, the history) and one toast says how it
// went. A run that ended before the page opened raises neither.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from '@/components/ui';
import type { Id } from '@/lib/api';
import { DASHBOARD_KEY, useApiQuery } from '@/lib/query';
import { getPublishRun } from '../api';
import { isSwitchLive, isWorking, RUN_POLL_MS, servicesText } from '../lib/publish';
import type { PublishRun } from '../types';
import { PUBLISH_RUNS_KEY, PUBLISH_STALE_KEYS, publishRunKey } from './keys';

/** What a finished apply or switch changes: the shop's listings and every count that reads them. */
function useMadeStale() {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  return useCallback(() => {
    void invalidate({ resource: 'service-listings', invalidates: ['list', 'many', 'detail'] });
    for (const queryKey of [...PUBLISH_STALE_KEYS, DASHBOARD_KEY]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }, [invalidate, queryClient]);
}

/**
 * The run `runId` (nothing while it is null), read again while it works. `run` is the last answer; `query` carries loading,
 * error and refetch. Several mounted views of one run share the cache entry, so the poll runs once.
 */
export function usePublishRun(runId: Id | null) {
  const queryClient = useQueryClient();
  const madeStale = useMadeStale();
  // The runs and switches this page saw working: only those that end while it watches raise the refresh and the toast.
  const applying = useRef(new Set<Id>());
  const switching = useRef(new Set<Id>());
  const preparing = useRef(new Set<Id>());

  const query = useApiQuery({
    queryKey: publishRunKey(runId ?? 0),
    queryFn: ({ signal }) => getPublishRun(runId as Id, { signal }),
    enabled: runId !== null,
    refetchInterval: (read) => (isWorking(read.state.data) ? RUN_POLL_MS : false),
  });
  const run: PublishRun | undefined = query.data;

  useEffect(() => {
    if (!run) return;
    if (run.status === 'preparing') preparing.current.add(run.id);
    else if (preparing.current.delete(run.id)) {
      void queryClient.invalidateQueries({ queryKey: PUBLISH_RUNS_KEY });
    }
    if (run.status === 'queued' || run.status === 'running') applying.current.add(run.id);
    else if (applying.current.delete(run.id)) {
      madeStale();
      if (run.status === 'succeeded') {
        toast({
          kind: 'success',
          title: `${servicesText(run.counts.published)} ${run.listed ? 'published' : 'created switched off'}`,
          ttl: 4000,
        });
      }
    }
    if (isSwitchLive(run)) switching.current.add(run.id);
    else if (switching.current.delete(run.id)) {
      madeStale();
      if (run.switch.status === 'done') {
        toast({
          kind: 'success',
          title: `${servicesText(run.switch.switched)} ${run.switch.listed ? 'put on the shop' : 'taken off the shop'}`,
          ttl: 4000,
        });
      }
    }
    // Each set is emptied as it fires, so a second run of this effect for the same answer does nothing.
  }, [run, madeStale, queryClient]);

  return { run, query };
}
