// What the Add dialog of the blocklist checks before it asks the server, and the body it sends. Ports the validation of the
// `bl-add` action in 54-p-risk.js. These are hints that save a round trip; the server checks the value again (and knows
// duplicates, which the demo found in its local list).
import type { AddableBlockKind, CreateBlocklistBody } from '../types';

/** The digits of an IMEI typed with or without the spaces the screen shows. */
export function imeiDigits(value: string): string {
  return value.replace(/\s/g, '');
}

/** True for the 15 digits of an IMEI. */
export function isImei(value: string): boolean {
  return /^\d{15}$/.test(imeiDigits(value));
}

/** The message under the Value field when the value cannot be right, else null. */
export function blockValueHint(kind: AddableBlockKind, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter what to block.';
  if (kind === 'imei' && !isImei(trimmed)) return 'An IMEI has 15 digits.';
  return null;
}

/** The message under the Reason field when it is empty, else null. */
export function blockReasonHint(reason: string): string | null {
  return reason.trim() ? null : 'Add a short reason so the next person knows why.';
}

/** The body of `POST /admin/blocklist`: an IMEI goes as its digits, the server formats it for display. */
export function toCreateBody(values: {
  kind: AddableBlockKind;
  value: string;
  reason: string;
}): CreateBlocklistBody {
  const value = values.kind === 'imei' ? imeiDigits(values.value.trim()) : values.value.trim();
  return { kind: values.kind, value, reason: values.reason.trim() };
}
