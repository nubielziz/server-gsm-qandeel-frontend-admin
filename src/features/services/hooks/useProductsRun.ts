// Which publish run the Shop Publish view shows, kept in the address (`?view=publish&run=12`), so a reload or a link opens the same run. No
// `run` is the start of the view (what to publish, the earlier runs). Opening a run, or going back to the start, adds a history entry and
// starts clean: the run's own filters (its preview rows, its result rows) are dropped. Every address is written by `productsPath`.
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import { parseRecordId, productsPath } from '../lib/productsPath';

/** `runId` is the run the address names (null at the start), `openRun` goes to a run and `closeRun` back to the start. */
export function useProductsRun(type: ServiceType) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const runId = parseRecordId(params.get('run'));

  const openRun = useCallback(
    (id: Id) => void navigate(productsPath({ view: 'publish', type, run: id })),
    [navigate, type],
  );
  const closeRun = useCallback(
    () => void navigate(productsPath({ view: 'publish', type })),
    [navigate, type],
  );
  return { runId, openRun, closeRun };
}
