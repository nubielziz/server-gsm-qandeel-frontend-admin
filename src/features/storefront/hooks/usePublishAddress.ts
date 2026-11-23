// Which run the publish view shows, kept in the address (`?view=publish&run=12`), so a reload or a link opens the same run. No `run`
// means the start of the view. Opening a run adds a history entry (Back returns to where the staff member was); the paging and
// filters of the run's rows live in the same address (`useListView`). The Catalog page may drive the same components with an
// address hook of its own; this one is the container the feature's own tests and any plain host use.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import type { Id } from '@/lib/api';

/** `runId` is the run the address names (null at the start), `openRun` goes to a run and `closeRun` back to the start. */
export function usePublishAddress() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('run');
  const runId: Id | null = raw && /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;

  const openRun = useCallback((id: Id) => setParams({ view: 'publish', run: String(id) }), [setParams]);
  const closeRun = useCallback(() => setParams({ view: 'publish' }), [setParams]);
  return { runId, openRun, closeRun };
}
