// What the preview of a draft asks the server and how its toolbar speaks: the address's filters as the rows route's filters, the
// status chips (All, Ready, Needs a look, Cannot publish, Left out) and what each sets, and the `select` of a bulk call (the ticked
// rows, or "all that match" as a filter). Pure; the server decides which rows match and what a bulk call changes.
import type { ListView } from './views';
import {
  PUBLISH_FLAGS,
  type BulkPublishItemsBody,
  type PublishBrandKind,
  type PublishItemSelection,
  type PublishRun,
  type PublishState,
} from '../types';
import { capital } from './publishStatus';
import { FLAG_WORDS } from './publishWords';

/** The most rows a bulk call can name by id; more than that must be "all that match". */
export const BULK_IDS_MAX = 500;

const STATES: readonly PublishState[] = ['ready', 'review', 'blocked'];
const BRAND_KINDS: readonly PublishBrandKind[] = ['device', 'tool', 'app'];

/** The filters of the address as the filters of the rows route (and of the bulk filter, which adds `q`): only what is set. */
export function previewFilters(filters: Record<string, string>): Omit<PublishItemSelection, 'q'> {
  const out: Omit<PublishItemSelection, 'q'> = {};
  const state = STATES.find((one) => one === filters.state);
  if (state) out.state = state;
  const flag = PUBLISH_FLAGS.find((one) => one === filters.flag);
  if (flag) out.flag = flag;
  const brandKind = BRAND_KINDS.find((one) => one === filters.brandKind);
  if (brandKind) out.brandKind = brandKind;
  if (filters.included === 'false') out.included = false;
  return out;
}

/** A text that changes when the search or a filter does: "all that match" is only true under the filter it was chosen under. */
export function matchKey(view: Pick<ListView, 'q' | 'filters'>): string {
  return JSON.stringify([view.q.trim(), previewFilters(view.filters)]);
}

/** The status chips: one is on at a time. `out` is "Left out" (the rows that are not ticked, blocked ones included). */
export type StatusChip = '' | PublishState | 'out';

/** Which chip the address shows. */
export function chipOf(filters: Record<string, string>): StatusChip {
  if (filters.included === 'false') return 'out';
  return STATES.find((one) => one === filters.state) ?? '';
}

/** What choosing a chip puts in the address: its own filter, and the other one off. */
export function chipFilters(chip: StatusChip): Record<string, string> {
  return {
    state: chip === 'ready' || chip === 'review' || chip === 'blocked' ? chip : '',
    included: chip === 'out' ? 'false' : '',
  };
}

/** The chips with the run's own counts (the server's figures); "Left out" is the rows that are not going to be published. */
export function chipsOf(run: Pick<PublishRun, 'total' | 'counts'>): { value: StatusChip; label: string }[] {
  const { ready, review, blocked, included } = run.counts;
  return [
    { value: '', label: 'All' },
    { value: 'ready', label: `Ready (${ready})` },
    { value: 'review', label: `Needs a look (${review})` },
    { value: 'blocked', label: `Cannot publish (${blocked})` },
    { value: 'out', label: `Left out (${Math.max(0, run.total - included)})` },
  ];
}

/** The options of the "Flag" select: every flag the server can set, in its words. */
export function flagOptions(): { value: string; label: string }[] {
  return [
    { value: '', label: 'Any flag' },
    ...PUBLISH_FLAGS.map((flag) => ({ value: flag, label: capital(FLAG_WORDS[flag]) })),
  ];
}

/** The options of the "Brand kind" select. */
export const BRAND_KIND_OPTIONS = [
  { value: '', label: 'Any brand' },
  { value: 'device', label: 'Device brands' },
  { value: 'tool', label: 'Tools' },
  { value: 'app', label: 'Apps' },
];

/**
 * The `select` of a bulk call: "all that match" is the filter and the search of the table; otherwise the ticked ids (null when
 * none are ticked, or when there are more than the route takes: pick "all that match" instead).
 */
export function bulkSelect(
  ticked: readonly number[],
  allMatching: boolean,
  view: Pick<ListView, 'q' | 'filters'>,
): BulkPublishItemsBody['select'] | null {
  if (allMatching) {
    const q = view.q.trim();
    return { filter: { ...previewFilters(view.filters), ...(q ? { q } : {}) } };
  }
  return ticked.length >= 1 && ticked.length <= BULK_IDS_MAX ? { itemIds: [...ticked] } : null;
}

/** What a bulk call changed, in words: "12 rows changed. 3 could not be included: they cannot be published." */
export function bulkNote(result: { changed: number; refused: number }): string {
  const rows = (count: number) => `${count} ${count === 1 ? 'row' : 'rows'}`;
  const parts = [`${rows(result.changed)} changed.`];
  if (result.refused > 0) {
    parts.push(
      `${rows(result.refused)} could not be included: ${result.refused === 1 ? 'it cannot' : 'they cannot'} be published.`,
    );
  }
  return parts.join(' ');
}
