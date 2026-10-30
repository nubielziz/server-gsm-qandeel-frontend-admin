// The import dialog's words and counts: the badge of each preview state, how the preview adds up, and which items an import
// sends. The server classifies the items (`POST …/import/preview`); this only names and counts what it said.
import type { BadgeTone, IconName } from '@/components/ui';
import type { Id } from '@/lib/api';
import type { ImportItemState, ImportPreviewItem } from '../types';

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
    counts.new > 0 && `${counts.new} new`,
    counts.changed > 0 && `${counts.changed} with a changed cost`,
    counts.matching > 0 && `${counts.matching} already match`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Nothing was picked';
}

/** The items an import sends: the new ones and the ones whose cost changed. Items that already match have nothing to do. */
export function importableIds(items: readonly ImportPreviewItem[]): Id[] {
  return items.filter((item) => item.state !== 'matching').map((item) => item.supplierServiceId);
}
