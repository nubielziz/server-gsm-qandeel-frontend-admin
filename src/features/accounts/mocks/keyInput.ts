// The checks the mock makes on the bodies of `POST /admin/clients/:id/api-keys` and `PATCH /admin/api-keys/:id`, with the limits
// of the backend's contract (name 1-60 and optional on a new key, up to 20 addresses, a limit of 1 to 6000, an expiry in the future, `null` on an
// edit for no expiry), the name the server gives a key made with none (`API key <n>`) and the rule that only an Owner widens a key (backend
// decisions 046 and 078). The `scopes` the console sends with a new key are not checked: a key is a Dhru credential. Mock only: the real rules
// are the server's (decision 014).
import type { ProblemError } from '@/mocks/problem';
import { textOf } from './shared';

const IP = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^[0-9a-f:]+(\/\d{1,3})?$/i;

/** What a valid body holds, ready to store. */
export type CheckedKeyBody = {
  name?: string;
  allowedIps?: string[];
  /** An ISO time, or `null` (an edit only) for no expiry. */
  expiresAt?: string | null;
  rateLimitPerMin?: number;
};

/** The words of the refusal when a staff member who is not an Owner widens a key (the backend's own). */
export const WIDEN_KEY_DETAIL =
  'Only an owner can widen an API key: more addresses, a higher limit, or a later or no end date.';

/** The name must be 1 to 60 characters once trimmed. */
function checkName(value: unknown, out: CheckedKeyBody, errors: ProblemError[]): void {
  const name = textOf(value);
  if (!name) errors.push({ field: 'name', message: 'Name the key.' });
  else if (name.length > 60) errors.push({ field: 'name', message: 'Use at most 60 characters.' });
  else out.name = name;
}

/** The expiry: a time in the future (and `null` where `allowNull` says so). */
function checkExpiry(value: unknown, out: CheckedKeyBody, errors: ProblemError[], allowNull: boolean): void {
  if (value === null && allowNull) {
    out.expiresAt = null;
    return;
  }
  const at = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  if (Number.isNaN(at) || at <= Date.now())
    errors.push({ field: 'expiresAt', message: 'Use a time in the future.' });
  else out.expiresAt = new Date(at).toISOString();
}

/** Checks the list of addresses (`allowedIps.N`) and the limit shared by the create and the edit. */
function checkLimits(body: Record<string, unknown>, out: CheckedKeyBody, errors: ProblemError[]): void {
  if (body.allowedIps !== undefined) {
    const entries = Array.isArray(body.allowedIps) ? body.allowedIps.map(textOf) : [];
    if (entries.length > 20) errors.push({ field: 'allowedIps', message: 'Use at most 20 addresses.' });
    entries.forEach((entry, index) => {
      if (!IP.test(entry))
        errors.push({ field: `allowedIps.${index}`, message: 'Enter an IP address or range.' });
    });
    out.allowedIps = [...new Set(entries)];
  }
  if (body.rateLimitPerMin !== undefined) {
    const limit = body.rateLimitPerMin;
    if (typeof limit !== 'number' || !Number.isInteger(limit)) {
      errors.push({ field: 'rateLimitPerMin', message: 'Use a whole number.' });
    } else if (limit < 1) errors.push({ field: 'rateLimitPerMin', message: 'Use at least 1.' });
    else if (limit > 6000) errors.push({ field: 'rateLimitPerMin', message: 'Use at most 6000.' });
    else out.rateLimitPerMin = limit;
  }
}

/** Checks a creation body; `errors` is empty when it is fine. A name left out is fine: the server names the key. */
export function checkNewKey(body: Record<string, unknown>): {
  value: CheckedKeyBody;
  errors: ProblemError[];
} {
  const errors: ProblemError[] = [];
  const value: CheckedKeyBody = {};
  if (body.name !== undefined) checkName(body.name, value, errors);
  if (body.expiresAt !== undefined) checkExpiry(body.expiresAt, value, errors, false);
  checkLimits(body, value, errors);
  return { value, errors };
}

/** Checks an edit: at least one field, each valid. */
export function checkKeyEdit(body: Record<string, unknown>): {
  value: CheckedKeyBody;
  errors: ProblemError[];
} {
  const errors: ProblemError[] = [];
  const value: CheckedKeyBody = {};
  const fields = ['name', 'rateLimitPerMin', 'allowedIps', 'expiresAt'];
  if (fields.every((field) => body[field] === undefined)) {
    errors.push({ field: 'rateLimitPerMin', message: 'Send at least one field to change.' });
  }
  if (body.name !== undefined) checkName(body.name, value, errors);
  if (body.expiresAt !== undefined) checkExpiry(body.expiresAt, value, errors, true);
  checkLimits(body, value, errors);
  return { value, errors };
}

/** The key as stored, for the rule below. */
type StoredKey = { allowedIps: readonly string[]; rateLimitPerMin: number; expiresAt: string | null };

/**
 * Whether an edit gives the key more reach, which only an Owner may do (the backend's rule): no restriction or an address that was not stored,
 * a higher limit, no expiry where there was one, or a later expiry. A first expiry, an earlier one, a narrower list, a lower limit and a new
 * name are for anyone with `api_keys:update`.
 */
export function widensKey(stored: StoredKey, next: CheckedKeyBody): boolean {
  if (next.expiresAt !== undefined) {
    if (next.expiresAt === null) {
      if (stored.expiresAt !== null) return true;
    } else if (stored.expiresAt !== null && Date.parse(next.expiresAt) > Date.parse(stored.expiresAt)) {
      return true;
    }
  }
  if (next.rateLimitPerMin !== undefined && next.rateLimitPerMin > stored.rateLimitPerMin) return true;
  if (next.allowedIps !== undefined && stored.allowedIps.length > 0) {
    const had = new Set(stored.allowedIps);
    return next.allowedIps.length === 0 || next.allowedIps.some((address) => !had.has(address));
  }
  return false;
}

/** The name of a key made with none: `API key ` and the smallest whole number from 1 that no key of the account carries in that exact form. */
export function defaultKeyName(names: readonly string[]): string {
  const used = new Set(
    names
      .map((name) => /^API key ([1-9][0-9]{0,8})$/.exec(name)?.[1])
      .filter((digits) => digits !== undefined)
      .map(Number),
  );
  let number = 1;
  while (used.has(number)) number += 1;
  return `API key ${number}`;
}

const KEY_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randomText = (length: number) =>
  Array.from({ length }, () => KEY_ALPHABET[Math.floor(Math.random() * KEY_ALPHABET.length)]).join('');

/** A new key's secret (`gsm_` and 44 characters) and the prefix kept for display (its first 8 characters). */
export function newSecret(): { secret: string; prefix: string } {
  const secret = `gsm_${randomText(44)}`;
  return { secret, prefix: secret.slice(0, 8) };
}
