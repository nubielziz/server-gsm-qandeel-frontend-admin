// The two rows of links under the Money heading, as data: the strip of tabs (Overview, Money in, Money back, Books, Reports) and the
// row of views of the current tab, each with the number of things waiting. Pure, so each rule is a test row; the page hands the items
// to the kit's `StripTabs` and `ViewLinks`. Every address is written by `moneyPath`.
import { num } from '@/lib/format';
import {
  areaOf,
  firstViewOf,
  moneyPath,
  usableAreas,
  type MoneyArea,
  type MoneyViewId,
  type MoneyViewSpec,
} from '../../lib/moneyViews';

/** What waits for a person, as the two count hooks report it: each is undefined while unknown or without its read permission. */
export type MoneyCounts = { deposits?: number; refunds?: number; disputes?: number };

/** One tab of the strip. */
export type StripItem = { id: MoneyArea; label: string; to: string };

/** One link of the row of views. `add` draws the plus ("+Issue invoice"). */
export type ViewItem = { id: MoneyViewId; label: string; to: string; add?: boolean };

/** " (1,204)" for a count, and nothing at zero or while the number is unknown: a count is a call to act, not a total. */
export function countText(count: number | undefined): string {
  return count ? ` (${num(count)})` : '';
}

/** What waits on Money back: refunds to decide or retry plus disputes that need evidence. Unknown only when both are. */
export function moneyBackCount(counts: MoneyCounts): number | undefined {
  if (counts.refunds === undefined && counts.disputes === undefined) return undefined;
  return (counts.refunds ?? 0) + (counts.disputes ?? 0);
}

// The number a tab shows: Money in the deposits to review, Money back everything waiting there; the other tabs show none.
function areaCount(area: MoneyArea, counts: MoneyCounts): number | undefined {
  if (area === 'in') return counts.deposits;
  if (area === 'back') return moneyBackCount(counts);
  return undefined;
}

// The number a link shows: only the three queues have one.
function viewCount(id: MoneyViewId, counts: MoneyCounts): number | undefined {
  if (id === 'deposits') return counts.deposits;
  if (id === 'refunds') return counts.refunds;
  if (id === 'disputes') return counts.disputes;
  return undefined;
}

/** The strip: a tab for each area that holds a view the role may use, linked to the first of them, with its count. */
export function stripItems(usable: readonly MoneyViewSpec[], counts: MoneyCounts = {}): StripItem[] {
  return usableAreas(usable).map((area) => ({
    id: area.id,
    label: `${area.label}${countText(areaCount(area.id, counts))}`,
    to: moneyPath(firstViewOf(area.id, usable)),
  }));
}

/** The tab to raise: the area of the view on screen. */
export function stripCurrent(view: MoneyViewId): MoneyArea {
  return areaOf(view);
}

/**
 * The row of views of the tab on screen, in the registry's order. The Overview tab has none (it is one view). A link the role may not
 * use is not drawn.
 */
export function viewItems(
  usable: readonly MoneyViewSpec[],
  view: MoneyViewId,
  counts: MoneyCounts = {},
): ViewItem[] {
  const area = areaOf(view);
  if (area === 'overview') return [];
  return usable
    .filter((spec) => spec.area === area)
    .map((spec) => ({
      id: spec.id,
      label: `${spec.label}${countText(viewCount(spec.id, counts))}`,
      to: moneyPath(spec.id),
      ...(spec.add ? { add: true } : {}),
    }));
}

/** The link to underline: the view on screen. */
export function currentLink(view: MoneyViewId): MoneyViewId {
  return view;
}
