// Which publish run the Catalog page's publish view shows, kept in the address (`?view=publish&run=12`), so a reload or a link opens
// the same run. No `run` is the start of the view (what to publish, the earlier runs). Opening a run, or going back to the start,
// adds a history entry and starts clean: the run's own filters (its preview rows, its result rows) are dropped.
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { Id } from '@/lib/api';
import { catalogPath } from '../lib/paths';
import { parseRunId } from '../lib/tabs';

/** `runId` is the run the address names (null at the start), `openRun` goes to a run and `closeRun` back to the start. */
export function useCatalogPublishAddress() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const runId = parseRunId(params.get('run'));

  const openRun = useCallback(
    (id: Id) => void navigate(catalogPath({ view: 'publish', run: id })),
    [navigate],
  );
  const closeRun = useCallback(() => void navigate(catalogPath({ view: 'publish' })), [navigate]);
  return { runId, openRun, closeRun };
}
