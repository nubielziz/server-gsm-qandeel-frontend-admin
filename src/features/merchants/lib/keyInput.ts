// Input helpers for the API key dialogs (create a key, change its limits): the scopes a staff member may pick, reading the allowed
// addresses (one per line) and the per-minute limit, the expiry day, and folding the server's per-entry field errors
// (`scopes.2`, `allowedIps.0`) onto the two inputs that hold the lists. Hints only: the server validates everything (decision 008).
import { ApiError, isApiError } from '@/lib/api';

/** The scopes a merchant key may carry, as the backend's `MERCHANT_KEY_SCOPES`, with what each allows. */
export const KEY_SCOPES: readonly { value: string; hint: string }[] = [
  { value: 'dhru', hint: 'Dhru Fusion client calls' },
  { value: 'account:read', hint: 'Read the account and wallet balance' },
  { value: 'orders:read', hint: 'Read orders' },
  { value: 'orders:write', hint: 'Place and change orders' },
  { value: 'services:read', hint: 'Read the service list and prices' },
];

/** The per-minute limit the server accepts, and the one a new key starts with. */
export const RATE_LIMIT = { min: 1, max: 6000, default: 60 } as const;

/** The most addresses or ranges a key may list. */
export const MAX_ALLOWED_IPS = 20;

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
 * Folds `scopes.N` onto `scopes` and `allowedIps.N` onto `allowedIps` (the form has one input for each list), with the line
 * number in front of an address message. Any other error, and anything that is not an ApiError, passes through unchanged.
 */
export function foldKeyErrors(error: unknown): unknown {
  if (!isApiError(error)) return error;
  const folded: Record<string, string[]> = {};
  let changed = false;
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    const entry = /^(scopes|allowedIps)\.(\d+)$/.exec(field);
    if (!entry) {
      folded[field] = [...(folded[field] ?? []), ...messages];
      continue;
    }
    changed = true;
    const prefix = entry[1] === 'allowedIps' ? `Line ${Number(entry[2]) + 1}: ` : '';
    folded[entry[1]] = [...(folded[entry[1]] ?? []), ...messages.map((message) => `${prefix}${message}`)];
  }
  if (!changed) return error;
  return new ApiError({
    status: error.status,
    code: error.code,
    title: error.title,
    detail: error.detail,
    type: error.type,
    fieldErrors: folded,
    formErrors: error.formErrors,
    requestId: error.requestId,
    retryAfter: error.retryAfter,
    cause: error,
  });
}
