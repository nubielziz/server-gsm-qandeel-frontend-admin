// Turns the outcome of a sequential run into what the summary dialog of the kit shows: names for the ids that failed.
import type { BulkSummary } from '@/components/ui';
import type { SequentialOutcome } from './runSequential';

/** How to name a record: its id (to find it again in `items`) and the label the table shows for it. */
export type SummaryNaming<K extends string | number, T> = {
  keyOf: (item: T) => K;
  labelOf: (item: T) => string;
};

/**
 * Names each failed id the way the table does, so the summary reads like the page. An id that is not in `items` is shown
 * as `#id`. `total` is the number of items the run was meant for.
 *
 * @param verb past tense for the sentence ("rejected", "switched off")
 * @param items the records the run was started for
 * @param outcome what `runSequential` returned
 */
export function summarizeOutcome<K extends string | number, T>(
  verb: string,
  items: readonly T[],
  outcome: SequentialOutcome<K>,
  { keyOf, labelOf }: SummaryNaming<K, T>,
): BulkSummary {
  return {
    verb,
    done: outcome.done,
    total: items.length,
    failed: outcome.failed.map((failure) => {
      const item = items.find((candidate) => keyOf(candidate) === failure.id);
      return { label: item ? labelOf(item) : `#${failure.id}`, reason: failure.reason };
    }),
  };
}
