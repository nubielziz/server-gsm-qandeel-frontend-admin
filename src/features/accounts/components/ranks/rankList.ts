// Pure helpers of the Ranks view: the words of a row, which ranks the Delete button may take, the link to a rank's accounts and the page of
// ranks the address names. The server sends every rank in one list (there are few), so the page is cut in the browser.
import { money, money0 } from '@/lib/format';
import { accountsListPath, DEFAULT_PAGE_SIZE } from '../../lib/paths';
import { isRetailRank, percentText } from '../../lib/ranks';
import type { Rank } from '../../types';
import { PAGE_SIZES } from '../list/listAddress';
import { plainDecimal } from './rankForm';

/** "Retail" for the shop's own rank, "Merchant" for any other. */
export function kindWord(rank: Rank): 'Retail' | 'Merchant' {
  return isRetailRank(rank) ? 'Retail' : 'Merchant';
}

/** The discount cell: the percent of a merchant rank; the retail rank has none, so a dash. */
export function discountText(rank: Rank): string {
  return isRetailRank(rank) ? '–' : percentText(rank.discountPercent);
}

/** The deposit limit as the server sends it: whole dollars when it is whole ("$20,000"), else with its decimals ("$12.50"). */
export function depositText(value: string): string {
  const plain = plainDecimal(value);
  if (!/^\d+(?:\.\d+)?$/.test(plain)) return '–';
  const decimals = plain.split('.')[1]?.length ?? 0;
  return decimals === 0 ? money0(plain) : money(plain, Math.max(2, decimals));
}

/** The reason a rank cannot be deleted, or null when it can. The server has the last word. */
export function deleteBlocker(rank: Rank): string | null {
  if (isRetailRank(rank)) return 'The retail rank cannot be deleted';
  return (rank.accountCount ?? 0) > 0 ? 'Move its accounts to another rank first' : null;
}

/** What Delete does with the ticked ranks: the ones it takes, the ones it leaves with their reasons, and why it is off when it takes none. */
export type DeleteOffer = {
  targets: Rank[];
  skipped: { rank: Rank; reason: string }[];
  /** Set when no ticked rank can be deleted: the reason of the first. */
  reason?: string;
};

/** Counts only the ranks with no account that are not the retail rank. */
export function deleteOffer(selected: readonly Rank[]): DeleteOffer {
  const targets: Rank[] = [];
  const skipped: DeleteOffer['skipped'] = [];
  for (const rank of selected) {
    const reason = deleteBlocker(rank);
    if (reason === null) targets.push(rank);
    else skipped.push({ rank, reason });
  }
  return { targets, skipped, reason: targets.length === 0 ? skipped[0]?.reason : undefined };
}

/** The title of the question before a delete: "Delete 2 ranks?". */
export function deleteTitle(count: number): string {
  return `Delete ${count} ${count === 1 ? 'rank' : 'ranks'}?`;
}

/** The All view filtered by a rank and the population it belongs to: the retail rank's accounts are the Retail tab, the others Merchants. */
export function rankAccountsPath(rank: Pick<Rank, 'id' | 'kind' | 'rankKind'>): string {
  return accountsListPath({ chip: isRetailRank(rank) ? 'retail' : 'merchants', rank: rank.id });
}

/** The address of a rank's edit view. */
export function editRankPath(id: number): string {
  return accountsListPath({ view: 'edit-rank', id });
}

// A positive whole number from an address, or null.
function wholeNumber(raw: string | null): number | null {
  if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

/** The page and page size the address of the Ranks view names; anything unknown or malformed reads as the first page of the default size. */
export function parseRanksAddress(params: URLSearchParams): { page: number; size: number } {
  const size = wholeNumber(params.get('size'));
  return {
    page: wholeNumber(params.get('page')) ?? 1,
    size: size !== null && PAGE_SIZES.includes(size) ? size : DEFAULT_PAGE_SIZE,
  };
}

/** The ranks of one page. A page past the end gives no rows; the view moves such an address to the last page. */
export function pageOf<T>(rows: readonly T[], page: number, size: number): T[] {
  return rows.slice((page - 1) * size, page * size);
}
