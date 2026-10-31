// Which queue's failed jobs and which job's history are open, kept in the address as `?queue=<name>` and `?job=<name>` so
// a link from the verdict or another tab opens them. Opening adds a history entry (Back closes the drawer); closing
// replaces it, like the order drawer does. Every other parameter (tab, range) stays as it is.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

type ViewParam = 'queue' | 'job';

/**
 * `queue` and `job` are the open names or null. An empty parameter (`?queue=`) counts as none. Only one drawer is open at
 * a time: a hand-made address with both shows the failed jobs and leaves the history alone, because two modal sheets
 * stacked on one another cannot both be used. Opening or closing a drawer drops the other address too, so closing it
 * leaves the tab, not a second drawer that was waiting behind.
 */
export function useQueuesView() {
  const [params, setParams] = useSearchParams();
  const queue = params.get('queue') || null;
  const job = queue ? null : params.get('job') || null;

  const change = useCallback(
    (key: ViewParam, value: string | null) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.delete('queue');
          next.delete('job');
          if (value !== null) next.set(key, value);
          return next;
        },
        value === null ? { replace: true } : undefined,
      ),
    [setParams],
  );

  return {
    queue,
    job,
    openQueue: useCallback((name: string) => change('queue', name), [change]),
    closeQueue: useCallback(() => change('queue', null), [change]),
    openJob: useCallback((name: string) => change('job', name), [change]),
    closeJob: useCallback(() => change('job', null), [change]),
  };
}
