// What staff type into the wallet dialogs: an amount and a reason, and the Idempotency-Key each dialog opening makes. Plain text
// handling with no float maths; the server decides what is allowed (limits, approval, holds).
import type { Money } from '@/lib/api';

// "1250", "1,250", "1250.5" or "$1,250.0000": a whole part (digits, or digits grouped by thousands commas) and up to four decimals.
const AMOUNT = /^(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,4}))?$/;

/**
 * The API's money text ("25.5" becomes "25.5000") for what was typed, or null when it is not an amount greater than zero.
 * A dollar sign and thousands commas are allowed; a comma used as a decimal mark ("25,50") is refused instead of being
 * read as 2550.
 */
export function parseWalletAmount(text: string): Money | null {
  const match = AMOUNT.exec(text.trim().replace(/^\$\s*/, ''));
  if (!match) return null;
  const whole = match[1].replaceAll(',', '').replace(/^0+(?=\d)/, '');
  const amount = `${whole}.${(match[2] ?? '').padEnd(4, '0')}`;
  return /[1-9]/.test(amount) ? amount : null;
}

/** A reason with the spaces tidied: trimmed, and every run of spaces made one. */
export function cleanReason(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * A fresh `Idempotency-Key`: a UUID, which fits the server's rule (1 to 100 printable characters, no spaces). A dialog makes
 * one when it opens and sends it with every retry of that opening.
 */
export function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  // Old browsers: a time-and-random key of the same shape of characters.
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
