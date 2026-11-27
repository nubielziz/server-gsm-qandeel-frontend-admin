// Input helpers for the API key dialogs (a new key, editing a key): reading the allowed addresses (one per line) and the per-minute
// limit, the day a key is valid until, what an edit sends (only what changed), and folding the server's per-entry field errors
// (`allowedIps.N`) onto the one box that holds the list. Hints only: the server validates everything (decision 008).
import { ApiError, isApiError } from '@/lib/api';
import type { ApiKey, UpdateApiKeyBody } from '../../types';

/** The per-minute limit the server accepts, and the one a new key starts with. */
export const RATE_LIMIT = { min: 1, max: 6000, default: 60 } as const;

/** The most addresses or ranges a key may list. */
export const MAX_ALLOWED_IPS = 20;

/** The most characters a key's name may have. */
export const KEY_NAME_MAX = 60;

/** A key's name as sent: trimmed. */
export function cleanKeyName(text: string): string {
  return text.trim();
}

/** The text of the allowed-addresses box as a list: one per line (commas and spaces also split), empty lines dropped. */
export function parseIpLines(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** The list as it fills the box: one address per line. */
export function ipLines(ips: readonly string[]): string {
  return ips.join('\n');
}

/** The per-minute limit typed, as a number, or null when it is not a whole number inside the range. */
export function parseRateLimit(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= RATE_LIMIT.min && value <= RATE_LIMIT.max ? value : null;
}

/**
 * The ISO time a chosen day ends, in the staff member's own time zone ("2026-12-31" is 23:59:59 that day), or undefined for no
 * expiry. The server refuses a time that is not in the future.
 */
export function expiryOf(day: string): string | undefined {
  if (!day) return undefined;
  const at = new Date(`${day}T23:59:59`);
  return Number.isNaN(at.getTime()) ? undefined : at.toISOString();
}

/** True when the day typed is before today (the date input's own limit is only a hint). */
export function dayIsPast(day: string, now: number = Date.now()): boolean {
  const end = expiryOf(day);
  return end !== undefined && Date.parse(end) <= now;
}

/**
 * The calendar day (`YYYY-MM-DD`, in the staff member's own time zone) an expiry time falls on: what the "Valid until" date box shows for a
 * key. Empty for no expiry (or a time that cannot be read).
 */
export function dayOf(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const at = new Date(expiresAt);
  if (Number.isNaN(at.getTime())) return '';
  const two = (value: number) => String(value).padStart(2, '0');
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`;
}

/**
 * What the form of an edit sends, from the key as it was and the form as it is: only a value that changed, so a save of one field
 * never asks the server to judge the others (a change of reach is for the Owner, and an untouched value is none). The name is trimmed,
 * the addresses are compared as lists, the day as a day (a key's expiry time is the end of its day, so an unchanged day sends nothing)
 * and a cleared day is `expiresAt: null`. An empty body means nothing changed.
 */
export function editBody(
  key: Pick<ApiKey, 'name' | 'allowedIps' | 'expiresAt' | 'rateLimitPerMin'>,
  form: { name: string; allowedIps: string; validUntil: string; rateLimitPerMin: string },
): UpdateApiKeyBody {
  const body: UpdateApiKeyBody = {};
  const name = cleanKeyName(form.name);
  if (name !== '' && name !== key.name) body.name = name;
  const addresses = parseIpLines(form.allowedIps);
  if (addresses.join('\n') !== key.allowedIps.join('\n')) body.allowedIps = addresses;
  if (form.validUntil !== dayOf(key.expiresAt)) {
    if (form.validUntil === '') body.expiresAt = null;
    else {
      const until = expiryOf(form.validUntil);
      if (until !== undefined) body.expiresAt = until;
    }
  }
  const limit = parseRateLimit(form.rateLimitPerMin);
  if (limit !== null && limit !== key.rateLimitPerMin) body.rateLimitPerMin = limit;
  return body;
}

/**
 * Folds `allowedIps.N` onto `allowedIps` (the form has one box for the list), with the line number in front of the message. Any other
 * error, and anything that is not an ApiError, passes through unchanged.
 */
export function foldKeyErrors(error: unknown): unknown {
  if (!isApiError(error)) return error;
  const folded: Record<string, string[]> = {};
  let changed = false;
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    const entry = /^allowedIps\.(\d+)$/.exec(field);
    if (!entry) {
      folded[field] = [...(folded[field] ?? []), ...messages];
      continue;
    }
    changed = true;
    const prefix = `Line ${Number(entry[1]) + 1}: `;
    folded.allowedIps = [...(folded.allowedIps ?? []), ...messages.map((message) => `${prefix}${message}`)];
  }
  if (!changed) return error;
  return new ApiError({
    status: error.status,
    code: error.code,
    title: error.title,
    detail: error.detail,
    type: error.type,
    fieldErrors: folded,
    fieldCodes: error.fieldCodes,
    formErrors: error.formErrors,
    requestId: error.requestId,
    retryAfter: error.retryAfter,
    cause: error,
  });
}
