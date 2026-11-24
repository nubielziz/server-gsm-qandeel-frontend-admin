// The reasons a rank change is refused, in words. The server answers 409 `RANK_CHANGE_BLOCKED` with one entry of
// `errors[]` per reason (field `groupId`, a code and a message) and writes nothing; the dialog lists every reason so the person
// sees all of them at once.
import { isApiError } from '@/lib/api';

/** The codes, in the order the server checks them. */
export const RANK_BLOCKER_CODES = [
  'guest',
  'open_hold',
  'live_order',
  'open_topup',
  'open_dispute',
  'open_refund',
  'open_checkout',
  'frozen',
  'negative_balance',
  'credit_limit',
] as const;

/** One reason a rank change was refused. */
export type RankBlockerCode = (typeof RANK_BLOCKER_CODES)[number];

/** Each reason in words, as the dialog lists it. */
export const RANK_BLOCKER_WORDS: Readonly<Record<RankBlockerCode, string>> = {
  guest: 'This is a guest. Make an account first: a guest keeps the retail rank.',
  open_hold: 'Orders still hold part of the wallet. Wait for them to finish.',
  live_order: 'An order is still in progress.',
  open_topup: 'A top-up is still open.',
  open_dispute: 'A dispute on a top-up is still open.',
  open_refund: 'A refund to the balance is still being made.',
  open_checkout: 'A checkout started by this account is still open.',
  frozen: 'The wallet is on hold. Lift the hold first.',
  negative_balance: 'The wallet balance is below zero. Bring it to zero first.',
  credit_limit:
    'The new rank allows no credit while the credit limit is above zero. Set the credit limit to 0 first.',
};

/** Whether a word is one of the codes the server uses. */
export function isRankBlockerCode(value: unknown): value is RankBlockerCode {
  return RANK_BLOCKER_CODES.some((code) => code === value);
}

/** A code in words; a word the console does not know is shown as it is. */
export function rankBlockerWords(code: string): string {
  return isRankBlockerCode(code) ? RANK_BLOCKER_WORDS[code] : code;
}

/** The part of an `ApiError` that may also carry the code of each `errors[]` entry, field by field (see `rankBlockersOf`). */
type WithFieldCodes = { fieldCodes?: Record<string, readonly string[]> };

/**
 * Every reason in a refused rank change, in words, without repeats; empty for any other error. The codes come from the error's
 * `fieldCodes` when it carries them (`groupId`), else from its messages: a message that is itself a code is turned into words, any
 * other message is shown as the server wrote it. Today's `ApiError` keeps only the messages, so until it also keeps
 * the code of each entry (`fieldCodes`) the words come from the server's messages.
 */
export function rankBlockersOf(error: unknown): string[] {
  if (!isApiError(error) || error.code !== 'RANK_CHANGE_BLOCKED') return [];
  const codes = (error as WithFieldCodes).fieldCodes?.groupId;
  const entries =
    codes && codes.length > 0 ? codes : [...(error.fieldErrors.groupId ?? []), ...error.formErrors];
  const words = entries.map((entry) => rankBlockerWords(entry));
  return [...new Set(words)];
}
