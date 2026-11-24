// What staff type into the wallet dialogs: an amount and a reason, and the direction the Add | Take switch means. The server decides what is
// allowed (limits, approval, holds); the console only stops what it can read as nonsense.
import type { Money } from '@/lib/api';
import type { AdjustDirection } from '../../types';
import { parseAmount } from './amount';

/** Shortest and longest reason of an adjustment (the server's rule: 5 to 140 characters). */
export const ADJUST_REASON_MIN = 5;
export const ADJUST_REASON_MAX = 140;

/** Shortest and longest reason of a hold or a lifted hold (5 to 200 characters). */
export const HOLD_REASON_MIN = 5;
export const HOLD_REASON_MAX = 200;

/**
 * The API's money text for an amount greater than zero, or null (zero, a negative, a comma decimal, more than four decimals).
 *
 * @param text what the Amount box holds.
 * @returns the four-decimal text, or null.
 */
export function parseWalletAmount(text: string): Money | null {
  return parseAmount(text);
}

/**
 * A reason with the spaces tidied: trimmed, and every run of spaces (or line breaks) made one space.
 *
 * @param text what the Reason box holds.
 * @returns the tidied reason.
 */
export function cleanReason(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Why a reason cannot be sent, or null when it can. The length is counted after tidying, as it is sent.
 *
 * @param text what the Reason box holds.
 * @param min shortest accepted reason.
 * @param max longest accepted reason.
 * @param what what the reason is kept for ("the entry", "the action"), for the sentence.
 * @returns the sentence to show under the box, or null.
 */
export function reasonProblem(text: string, min: number, max: number, what: string): string | null {
  const length = cleanReason(text).length;
  if (length < min) return `Add a reason of at least ${min} characters so ${what} can be audited later.`;
  if (length > max) return `Keep the reason to ${max} characters or fewer.`;
  return null;
}

/**
 * The direction of an adjustment from the Add | Take switch: "Add" credits the wallet, "Take" debits it.
 *
 * @param add true when the switch is on "Add".
 * @returns the direction the API takes.
 */
export function directionOf(add: boolean): AdjustDirection {
  return add ? 'credit' : 'debit';
}
