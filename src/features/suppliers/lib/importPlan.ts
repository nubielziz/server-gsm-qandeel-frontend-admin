// The import dialog's words and counts: the badge of each preview state, how the preview adds up, which items an import sends,
// how the answers of several batches become one, and what the button and the error say while a long list goes 500 at a time. The
// server classifies the items (`POST …/import/preview`); this only names and counts what it said.
import type { BadgeTone, IconName } from '@/components/ui';
import type { Id } from '@/lib/api';
import { num } from '@/lib/format';
import type { ImportItemState, ImportPreview, ImportPreviewItem, ImportResult } from '../types';
import { BATCH_SIZE } from './batches';
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

/** The answers of the import calls (one per batch) added up, as if one call had done it all. */
export function mergeResults(answers: readonly ImportResult[]): ImportResult {
  return answers.reduce<ImportResult>(
    (sum, answer) => ({
      created: sum.created + answer.created,
      updated: sum.updated + answer.updated,
      unchanged: sum.unchanged + answer.unchanged,
    }),
    { created: 0, updated: 0, unchanged: 0 },
  );
}

/** "and 932 more": the line under a preview table that shows only its first rows. Empty when every row is shown. */
export function hiddenRowsText(shown: number, total: number): string {
  return total > shown ? `and ${num(total - shown)} more` : '';
}

/** Where a batched call is: `upTo` is the end of the batch in flight (null when none goes), `handled` what the server answered. */
export type RunState = { upTo: number | null; handled: number; total: number };

/**
 * The words on the primary button of a step: its own words (`plain`), "Previewing 500 of 1,132…" while a list of more than one
 * batch goes, and "Continue previewing (632 left)" after a batch failed with some already done. A list of one batch keeps `plain`
 * (the button shows its spinner).
 */
export function runWords(verb: 'Preview' | 'Import', plain: string, run: RunState | null): string {
  if (run === null) return plain;
  const [ing, lower] = verb === 'Preview' ? ['Previewing', 'previewing'] : ['Importing', 'importing'];
  if (run.upTo !== null)
    return run.total > BATCH_SIZE ? `${ing} ${num(run.upTo)} of ${num(run.total)}…` : plain;
  const left = run.total - run.handled;
  return run.handled > 0 && left > 0 ? `Continue ${lower} (${num(left)} left)` : plain;
}

/**
 * What the dialog says when a call stopped: how many services went through before it, then the server's own words. When the first
 * batch failed nothing went through, so only the server's words are shown.
 */
export function stoppedText(
  verb: 'previewed' | 'imported',
  stopped: { handled: number; total: number },
  reason: string,
): string {
  if (stopped.handled === 0) return reason;
  return `${num(stopped.handled)} of ${servicesText(stopped.total)} were ${verb} before it stopped. ${reason}`;
}
