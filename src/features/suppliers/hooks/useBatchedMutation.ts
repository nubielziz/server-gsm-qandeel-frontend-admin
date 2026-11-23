// A mutation that sends a long list in batches (the import's preview and import take 500 ids per call). It keeps the run that
// stopped, so pressing the button again goes on with the batches that are left instead of sending the ones that went through,
// and it keeps the answer of every batch the server gave, also when a later batch fails.
import { useRef, useState } from 'react';
import { useApiMutation, type UseApiMutationOptions } from '@/lib/query';
import { BatchStopped, createBatchRun, sameItems, type BatchRun } from '../lib/batches';

/** Where the last run is, for the dialog's button and error line. */
export type BatchProgress<T> = {
  /** End of the batch in flight, or null while nothing goes. */
  upTo: number | null;
  /** Items in the batches the server answered. */
  handled: number;
  total: number;
  /** The list the run is for: a changed list is not a run to go on with. */
  items: readonly T[];
};

export type UseBatchedMutationOptions<T, R, TData> = Omit<
  UseApiMutationOptions<TData, readonly T[]>,
  'mutationFn'
> & {
  /** One call for one batch. */
  send: (batch: T[]) => Promise<R>;
  /** The answers of all batches as the one answer the dialog uses (and the success toast and refresh see). */
  merge: (answers: readonly R[]) => TData;
  /** Called when a run fails after some batches went through, so what they changed can be refreshed. */
  onPartial?: () => void;
};

/**
 * `run(items)` sends the list in batches of 500, one after the other. When a batch fails it throws a `BatchStopped` (how far it
 * got, and the error of the call); `run` with the same list goes on with the rest. A list that differs starts again. Nothing is
 * toasted on failure: the dialog shows it.
 */
export function useBatchedMutation<T, R, TData>({
  send,
  merge,
  onPartial,
  ...options
}: UseBatchedMutationOptions<T, R, TData>) {
  const current = useRef<BatchRun<T, R> | null>(null);
  const [progress, setProgress] = useState<BatchProgress<T> | null>(null);
  const [answers, setAnswers] = useState<readonly R[]>([]);
  const mutation = useApiMutation<TData, readonly T[]>({
    ...options,
    mutationFn: async (items) => {
      const kept = current.current;
      const run = kept && sameItems(kept.items, items) ? kept : createBatchRun<T, R>(items);
      // A list that differs starts a new run, so the answers of the old one are not this run's.
      if (run !== kept) setAnswers([]);
      current.current = run;
      const report = (upTo: number | null) =>
        setProgress({ upTo, handled: run.handled, total: run.total, items });
      try {
        // The answer of each batch is kept as it arrives: a later batch that fails must not lose what the earlier ones did.
        const keep = async (batch: T[]) => {
          const answer = await send(batch);
          setAnswers([...run.results, answer]);
          return answer;
        };
        const all = await run.run(keep, report);
        current.current = null;
        return merge(all);
      } catch (failure) {
        if (run.handled > 0) onPartial?.();
        throw failure;
      } finally {
        report(null);
      }
    },
  });
  const { mutateAsync } = mutation;

  return {
    isPending: mutation.isPending,
    progress,
    /**
     * The answer of every batch the server has given for the current list, in order, kept after a batch failed and after the
     * last one answered. A list that differs from the one before starts again with none.
     */
    answers,
    /** Sends (or goes on sending) the list; a failure is a `BatchStopped`. */
    async run(items: readonly T[]): Promise<TData> {
      try {
        return await mutateAsync(items);
      } catch (failure) {
        const run = current.current;
        throw new BatchStopped(run?.handled ?? 0, run?.total ?? items.length, failure);
      }
    },
    /** The progress when it is for exactly this list (a list that changed since is not the run on screen), else null. */
    progressFor(items: readonly T[]): BatchProgress<T> | null {
      return progress && sameItems(progress.items, items) ? progress : null;
    },
    /** Forgets the run that stopped (the dialog went Back: its list is to be made again). */
    reset() {
      current.current = null;
      setProgress(null);
      setAnswers([]);
    },
  };
}
