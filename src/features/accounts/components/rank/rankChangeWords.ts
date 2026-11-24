// The words of the rank change dialog: how the current rank and each choice read, and what the change will do, said before the person
// confirms. The server decides every rule and answers with every blocker; these sentences only say the consequences it documents
// (the rank change route): same kind, retail to merchant, merchant to retail. Pure, so each sentence is a test row.
import type { Money } from '@/lib/api';
import { money } from '@/lib/format';
import { isMerchantRank, ranksOfKind, rankLabel } from '../../lib/ranks';
import type { Rank, RankRef } from '../../types';

/** The current rank as the dialog's first row reads it: "Retail" for the shop's rank, "VIP, merchant" for a merchant rank. */
export function currentRankText(rank: Pick<RankRef, 'name' | 'kind'>): string {
  return rank.kind === 'merchant' ? `${rank.name}, merchant` : 'Retail';
}

/**
 * The ranks the account can move to: every rank but the current one, the shop's retail rank first, then the merchant ranks in the
 * order the server keeps them.
 */
export function rankChoices(ranks: readonly Rank[], currentId: number): Rank[] {
  const others = ranks.filter((rank) => rank.id !== currentId);
  return [...ranksOfKind(others, 'retail'), ...ranksOfKind(others, 'merchant')];
}

/** A choice in the menu: the rank with its discount, and the default merchant rank marked as where new merchants start. */
export function rankChoiceLabel(rank: Rank): string {
  const base = isMerchantRank(rank) ? rankLabel(rank) : rank.name;
  return rank.isDefault ? `${base} · new merchants start here` : base;
}

/** The wallet figures the sentences use; a read the staff member may not make leaves them out. */
export type WalletFigures = { balance: Money; creditLimit: Money };

/** What the change does, as lines for the dialog, and whether it crosses kinds (the confirm button is then the danger one). */
export type RankConsequence = { lines: string[]; warning?: string; crosses: boolean };

/**
 * What moving the account to `target` will do.
 *
 * - Same kind: new orders use the new prices; a target that allows no credit while the limit is above zero is refused by the server, so
 *   the warning says to set the limit to 0 first.
 * - Retail to merchant: the store balance moves to a merchant wallet, every session ends, a username is made for the API, the credit
 *   limit is set afterwards; an account with no password yet is invited.
 * - Merchant to retail: the wallet balance moves to the store balance, every session ends, every API key is revoked and the credit
 *   limit becomes 0.
 *
 * @param from the rank the account holds
 * @param target the rank chosen
 * @param wallet the wallet figures, when they could be read
 * @param hasPassword whether the account already has a password
 */
export function rankConsequence(
  from: Pick<RankRef, 'kind'>,
  target: Pick<Rank, 'name' | 'rankKind' | 'overdraftAllowed'>,
  wallet: WalletFigures | undefined,
  hasPassword: boolean,
): RankConsequence {
  const toMerchant = target.rankKind === 'merchant';
  const fromMerchant = from.kind === 'merchant';
  if (toMerchant === fromMerchant) {
    const lines = [`New orders use ${target.name} prices.`];
    const warning =
      wallet && Number(wallet.creditLimit) > 0 && !target.overdraftAllowed
        ? 'Set the credit limit to 0 first in Financial.'
        : undefined;
    return { lines, warning, crosses: false };
  }
  const amount = wallet ? money(wallet.balance) : undefined;
  const moves = wallet !== undefined && Number(wallet.balance) > 0;
  if (toMerchant) {
    return {
      lines: [
        moves
          ? `The store balance of ${amount} moves to the merchant wallet.`
          : 'There is no store balance to move.',
        'Every session of the account ends.',
        'A username for the API is made.',
        'Set a credit limit afterwards in Financial if the rank allows credit.',
        ...(hasPassword ? [] : ['An invitation to set a password goes out.']),
      ],
      crosses: true,
    };
  }
  return {
    lines: [
      moves
        ? `The wallet balance of ${amount} moves to the store balance.`
        : 'There is no wallet balance to move.',
      'Every session ends, every API key is revoked and the credit limit becomes 0.',
    ],
    crosses: true,
  };
}
