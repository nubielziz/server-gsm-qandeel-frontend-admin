// Helpers for ranks: how a rank reads in a menu and a cell, which test says a rank is the shop's retail rank, and the percent text. Ports
// the GROUPS labels of 42-p-merchants.js ("Wholesale (-4%)"), now for every rank.
import type { Decimal } from '@/lib/api';
import type { Rank, RankChangeResult, RankKind, RankRef } from '../types';

/** The `kind` the rank table stores for the shop's single retail rank. */
export const RETAIL_RANK_KIND = 'b2c_retail';

/** What a rank has to say about its kind: the stored word and, on the wire's rank rows, `rankKind`. A rank row and a rank reference both fit. */
export type RankLike = { kind: string; rankKind?: string };

/**
 * The kind of a rank as the wire says it, read fail-closed: only an explicit merchant word is a merchant, so an unknown word never
 * gives merchant rights. Accepts a rank row, a rank reference, or a bare word.
 */
export function rankKindOf(rank: RankLike | string | null | undefined): RankKind {
  if (typeof rank === 'string') return rank === 'merchant' || rank === 'b2b' ? 'merchant' : 'retail';
  if (!rank) return 'retail';
  if (rank.rankKind) return rank.rankKind === 'merchant' ? 'merchant' : 'retail';
  return rank.kind === 'merchant' || rank.kind === 'b2b' ? 'merchant' : 'retail';
}

/** True for the shop's retail rank: its accounts have retail rights and a store balance. */
export function isRetailRank(rank: RankLike | null | undefined): boolean {
  return rankKindOf(rank) === 'retail';
}

/** True for a merchant rank (an account in it has a merchant wallet, API keys and fixed prices). */
export function isMerchantRank(rank: RankLike | null | undefined): boolean {
  return rankKindOf(rank) === 'merchant';
}

/** The ranks of one kind, in the order given. A hint only; the server decides. */
export function ranksOfKind<T extends RankLike>(ranks: readonly T[], kind: RankKind): T[] {
  return ranks.filter((rank) => rankKindOf(rank) === kind);
}

/** A percent as text without extra zeros: "4.0000" is "4%", "2.50" is "2.5%". */
export function percentText(value: Decimal): string {
  const number = Number(value);
  return Number.isFinite(number) ? `${number}%` : '–';
}

/** A rank in a menu: its name and, when it has a discount, the discount ("Wholesale (-4%)"). */
export function rankLabel(
  rank: Pick<Rank, 'name' | 'discountPercent'> | Pick<RankRef, 'name' | 'discountPercent'>,
): string {
  const discount = Number(rank.discountPercent);
  return discount > 0 ? `${rank.name} (-${discount}%)` : rank.name;
}

/** The rank a new merchant starts in: the default merchant rank, else the first merchant rank. Undefined when there are none. */
export function defaultMerchantRankId(ranks: readonly Rank[]): number | undefined {
  const merchants = ranksOfKind(ranks, 'merchant');
  return (merchants.find((rank) => rank.isDefault) ?? merchants[0])?.id;
}

/**
 * What a rank change did, in sentences, for the toast: the amount moved between the two wallets, the sessions it ended and the API keys
 * it revoked. A part the answer does not name is left out. `format` writes an amount (the console's `money`).
 */
export function rankChangeParts(
  result: Pick<RankChangeResult, 'movedAmount' | 'wallet' | 'sessionsEnded' | 'apiKeysRevoked'>,
  format: (amount: string) => string,
): string[] {
  const parts: string[] = [];
  if (Number(result.movedAmount) > 0) {
    const target = result.wallet?.kind === 'merchant' ? 'merchant wallet' : 'store balance';
    parts.push(`${format(result.movedAmount)} moved to the ${target}.`);
  }
  if (result.sessionsEnded > 0) {
    parts.push(`${result.sessionsEnded} ${result.sessionsEnded === 1 ? 'session' : 'sessions'} ended.`);
  }
  if (result.apiKeysRevoked > 0) {
    parts.push(`${result.apiKeysRevoked} API ${result.apiKeysRevoked === 1 ? 'key' : 'keys'} revoked.`);
  }
  return parts;
}

/** The shop's retail rank, when the list has it. */
export function retailRank<T extends RankLike>(ranks: readonly T[]): T | undefined {
  return ranks.find((rank) => rankKindOf(rank) === 'retail');
}
