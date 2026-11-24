// The two rows of links of the Accounts page, as data: the strip of populations (All accounts, Retail, Merchants, Guests, and the open
// account's own tab) and the row of views (All | +Add Account | Ranks | +Add Rank, a divider, Data requests). Pure, so each rule is a
// test row; the page hands the items to the kit's `StripTabs` and `ViewLinks`. Every address is written by the data layer's builders.
import { num } from '@/lib/format';
import { accountPath, accountsListPath } from '../../lib/paths';
import type { AccountCounts } from '../../types';
import { stripKeyOf, type ListAddress, type StripKey } from '../list/listAddress';
import { firstListedView } from './accountsViews';
import type { AccountsViewId, AccountsViewSpec } from '../types';

/** One tab of the strip. */
export type StripItem = { id: StripKey | 'record'; label: string; to: string };

/** One link of the row of views. `after: 'divider'` draws a thin divider after the link. */
export type ViewItem = { id: AccountsViewId; label: string; to: string; add?: boolean; after?: 'divider' };

export { firstListedView };

/** " (1,204)" for a count, and nothing while the number is unknown (loading, or the count failed). */
export function countText(count: number | undefined): string {
  return count === undefined ? '' : ` (${num(count)})`;
}

/** The words of each tab of the strip, before its count. */
const STRIP_LABELS: Record<StripKey, string> = {
  all: 'All accounts',
  retail: 'Retail',
  merchants: 'Merchants',
  guests: 'Guests',
};

// The number each tab shows: `merchant` is the counts route's word for the merchant ranks.
const countOf = (counts: AccountCounts | undefined, key: StripKey): number | undefined =>
  counts === undefined
    ? undefined
    : { all: counts.all, retail: counts.retail, merchants: counts.merchant, guests: counts.guests }[key];

/**
 * The strip: a tab per population with its count, plus the open record's own tab when one is open. Each tab links to the All view of its
 * population; `linkOf` says where (the page restores the list as it was last seen under that tab).
 */
export function stripItems(
  counts: AccountCounts | undefined,
  options: { linkOf?: (key: StripKey) => string; record?: { id: number; label: string } } = {},
): StripItem[] {
  const linkOf = options.linkOf ?? ((key) => accountsListPath({ chip: key }));
  const items: StripItem[] = (['all', 'retail', 'merchants', 'guests'] as const).map((key) => ({
    id: key,
    label: `${STRIP_LABELS[key]}${countText(countOf(counts, key))}`,
    to: linkOf(key),
  }));
  return options.record
    ? [...items, { id: 'record', label: options.record.label, to: accountPath(options.record.id) }]
    : items;
}

/**
 * The tab to raise: on the All view the population the address names, on a record its own tab, and nothing (the empty string) on
 * Ranks, +Add Rank, Edit rank, Data requests and +Add Account, which are not lists of accounts.
 */
export function stripCurrent(
  view: AccountsViewId,
  address: Pick<ListAddress, 'chip'>,
  onRecord: boolean,
): string {
  if (onRecord) return 'record';
  return view === 'all' ? stripKeyOf(address.chip) : '';
}

/**
 * The row of views the role may use, in the registry's order, with the divider between the two groups when both have links.
 * `requests` is the open count of the Data requests link, left out at zero or while unknown.
 */
export function viewItems(usable: readonly AccountsViewSpec[], requests?: number): ViewItem[] {
  const listed = usable.filter((spec) => spec.group !== 'hidden');
  const lastMain = listed.filter((spec) => spec.group === 'main').at(-1);
  const hasExtra = listed.some((spec) => spec.group === 'extra');
  return listed.map((spec) => ({
    id: spec.id,
    label: spec.id === 'requests' && requests ? `${spec.label}${countText(requests)}` : spec.label,
    to: accountsListPath({ view: spec.id }),
    ...(spec.add ? { add: true } : {}),
    ...(hasExtra && spec === lastMain ? { after: 'divider' as const } : {}),
  }));
}

/** The link to light for a view: the view's own, or the list an edit view belongs to (Edit rank lights Ranks). */
export function currentLink(view: AccountsViewId): AccountsViewId {
  return view === 'edit-rank' ? 'ranks' : view;
}
