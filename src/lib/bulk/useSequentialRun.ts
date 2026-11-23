// Runs a sequential bulk action with a progress line, reports every failure to the auth provider and refreshes once at the end.
// Lifted from the orders feature's bulk hook (MISMATCHES M23); each feature gives its own `refresh`.
import { useOnError } from '@refinedev/core';
import { useCallback, useState } from 'react';
import { runSequential, type SequentialOutcome } from './runSequential';

/** What a progress line says: the verb ("Rejecting") and how far the run is. */
export type RunProgress = { verb: string; done: number; total: number };

/**
 * `run(verb, ids, step)` calls `step` for each id (see `runSequential`) and returns what went through. Every failure is also
 * reported to the auth provider, as `useApiMutation` does, so a 401 signs the staff member out. `progress` is set while a
 * run is going. When the run ends, `refresh(ids)` is called once, so the lists show what changed.
 *
 * @param refresh makes the screens that show these ids stale; keep it stable (`useCallback`), or `run` changes every render
 */
export function useSequentialRun<K extends string | number>(
  refresh: (ids: readonly K[]) => Promise<unknown> | void,
) {
  const { mutate: checkError } = useOnError();
  const [progress, setProgress] = useState<RunProgress | null>(null);

  const run = useCallback(
    async (
      verb: string,
      ids: readonly K[],
      step: (id: K) => Promise<unknown>,
    ): Promise<SequentialOutcome<K>> => {
      setProgress({ verb, done: 0, total: ids.length });
      try {
        return await runSequential(
          ids,
          async (id) => {
            try {
              return await step(id);
            } catch (error) {
              checkError(error as Parameters<typeof checkError>[0]);
              throw error;
            }
          },
          (done, total) => setProgress({ verb, done, total }),
        );
      } finally {
        setProgress(null);
        await refresh(ids);
      }
    },
    [checkError, refresh],
  );

  return { run, progress };
}
