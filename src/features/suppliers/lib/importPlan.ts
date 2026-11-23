// The import dialog's words and counts: the badge of each preview state, how the preview adds up, which items an import sends,
// how the answers of several batches become one, and what the button and the error say while a long list goes 500 at a time. The
// server classifies the items (`POST …/import/preview`); this only names and counts what it said.
import { errorText, type BadgeTone, type IconName } from '@/components/ui';
import type { Id } from '@/lib/api';
import { num } from '@/lib/format';
import type { ImportItemState, ImportPreview, ImportPreviewItem, ImportResult } from '../types';
import { BATCH_SIZE, BatchStopped } from './batches';
import { servicesText } from './quickAdd';

/** The most rows of the preview the table draws; the summary above it counts every item. */
export const PREVIEW_ROWS = 200;

/** The badge of each state of the preview. */
export const IMPORT_BADGE: Readonly<
  Record<ImportItemState, { label: string; tone: BadgeTone; icon: IconName }>
> = {
  new: { label: 'New', tone: 'accent', icon: 'plus' },
  matching: { label: 'Matches', tone: 'neutral', icon: 'check' },
  changed: { label: 'Cost changed', tone: 'warn', icon: 'alert' },
};

/** How many items are in each state. */
export type ImportCounts = Record<ImportItemState, number>;

/** Counts the preview items by state. */
export function countItems(items: readonly Pick<ImportPreviewItem, 'state'>[]): ImportCounts {
  const counts: ImportCounts = { new: 0, matching: 0, changed: 0 };
  for (const item of items) counts[item.state] += 1;
  return counts;
}

/** "2 new, 1 with a changed cost, 3 already match": the line above the preview table. */
export function previewSummary(counts: ImportCounts): string {
  const parts = [
    counts.new > 0 && `${num(counts.new)} new`,
    counts.changed > 0 && `${num(counts.changed)} with a changed cost`,
    counts.matching > 0 && `${num(counts.matching)} already match`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Nothing was picked';
}

/** The items an import sends: the new ones and the ones whose cost changed. Items that already match have nothing to do. */
export function importableIds(items: readonly ImportPreviewItem[]): Id[] {
  return items.filter((item) => item.state !== 'matching').map((item) => item.supplierServiceId);
}

/** The answers of the preview calls (one per batch) as one list, in the order of the picks. */
export function mergePreviews(answers: readonly ImportPreview[]): ImportPreviewItem[] {
  return answers.flatMap((answer) => answer.items);
}

/**
 * The answers of the import calls (one per batch) added up, as if one call had done it all. The ids of the services the calls created
 * are put together in the order of the batches; the key is there only when an answer carried it.
 */
export function mergeResults(answers: readonly ImportResult[]): ImportResult {
  const sum = answers.reduce<ImportResult>(
    (total, answer) => ({
      created: total.created + answer.created,
      updated: total.updated + answer.updated,
      unchanged: total.unchanged + answer.unchanged,
    }),
    { created: 0, updated: 0, unchanged: 0 },
  );
  if (!answers.some((answer) => answer.createdServiceIds !== undefined)) return sum;
  return { ...sum, createdServiceIds: answers.flatMap((answer) => answer.createdServiceIds ?? []) };
}

/** The toast after an import: how many services it brought in, and how that splits into new, updated and unchanged. */
export function importToast(result: ImportResult): { message: string; description: string } {
  return {
    message: `${num(result.created + result.updated)} services imported`,
    description: [
      result.created > 0 && `${num(result.created)} new`,
      result.updated > 0 && `${num(result.updated)} updated`,
      result.unchanged > 0 && `${num(result.unchanged)} unchanged`,
    ]
      .filter(Boolean)
      .join(', '),
  };
}

/** "and 932 more": the line under a preview table that shows only its first rows. Empty when every row is shown. */
export function hiddenRowsText(shown: number, total: number): string {
  return total > shown ? `and ${num(total - shown)} more` : '';
}

/** Where a batched call is: `upTo` is the end of the batch in flight (null when none goes), `handled` what the server answered. */
export type RunState = { upTo: number | null; handled: number; total: number };

/** What a batched call is doing, as the primary button names it: the Add flow says "Add", the import dialog "Import". */
export type RunVerb = 'Preview' | 'Import' | 'Add';

const RUN_VERB: Record<RunVerb, readonly [string, string]> = {
  Preview: ['Previewing', 'previewing'],
  Import: ['Importing', 'importing'],
  Add: ['Adding', 'adding'],
};

/**
 * The words on the primary button of a step: its own words (`plain`), "Previewing 500 of 1,132…" while a list of more than one
 * batch goes, and "Continue previewing (632 left)" after a batch failed with some already done. A list of one batch keeps `plain`
 * (the button shows its spinner).
 */
export function runWords(verb: RunVerb, plain: string, run: RunState | null): string {
  if (run === null) return plain;
  const [ing, lower] = RUN_VERB[verb];
  if (run.upTo !== null)
    return run.total > BATCH_SIZE ? `${ing} ${num(run.upTo)} of ${num(run.total)}…` : plain;
  const left = run.total - run.handled;
  return run.handled > 0 && left > 0 ? `Continue ${lower} (${num(left)} left)` : plain;
}

/** The past tense a stopped call is told with: the preview "previewed", the import "imported", the Add flow "added". */
export type StoppedVerb = 'previewed' | 'imported' | 'added';

/**
 * What the dialog's error slot says for a failed call: how far a long list got before it (when it did), then the server's words.
 * Any other failure is just the server's words.
 */
export function failureText(failure: unknown, verb: StoppedVerb): string {
  if (!(failure instanceof BatchStopped)) return errorText(failure);
  return stoppedText(verb, failure, errorText(failure.reason));
}

/**
 * What the dialog says when a call stopped: how many services went through before it, then the server's own words. When the first
 * batch failed nothing went through, so only the server's words are shown.
 */
export function stoppedText(
  verb: StoppedVerb,
  stopped: { handled: number; total: number },
  reason: string,
): string {
  if (stopped.handled === 0) return reason;
  return `${num(stopped.handled)} of ${servicesText(stopped.total)} were ${verb} before it stopped. ${reason}`;
}
