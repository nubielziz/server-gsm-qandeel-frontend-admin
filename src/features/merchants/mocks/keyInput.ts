// The checks the mock makes on the bodies of `POST /admin/clients/:id/api-keys` and `PATCH /admin/api-keys/:id`, with the limits
// of the backend's contract (name 1-60, 1-20 scopes, up to 20 addresses, a limit of 1 to 6000, an expiry in the future). Mock
// only: the real rules are the server's (decision 014).
import type { ProblemError } from '@/mocks/problem';
import { textOf } from './shared';

const SCOPES = ['dhru', 'account:read', 'orders:read', 'orders:write', 'services:read'];
const AREAS = ['account', 'orders', 'services'];
const IP = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^[0-9a-f:]+(\/\d{1,3})?$/i;

/** What a valid body holds, ready to store. */
export type CheckedKeyBody = {
  name?: string;
  scopes?: string[];
  allowedIps?: string[];
  expiresAt?: string;
  rateLimitPerMin?: number;
};

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

/** Checks a creation body; `errors` is empty when it is fine. */
export function checkNewKey(body: Record<string, unknown>): {
  value: CheckedKeyBody;
  errors: ProblemError[];
} {
  const errors: ProblemError[] = [];
  const value: CheckedKeyBody = {};
  const name = textOf(body.name);
  if (!name) errors.push({ field: 'name', message: 'Name the key.' });
  else if (name.length > 60) errors.push({ field: 'name', message: 'Use at most 60 characters.' });
  else value.name = name;

  const scopes = Array.isArray(body.scopes) ? body.scopes.map(textOf) : [];
  if (scopes.length === 0) errors.push({ field: 'scopes', message: 'Choose at least one scope.' });
  scopes.forEach((scope, index) => {
    const known = SCOPES.includes(scope) || (scope.endsWith(':*') && AREAS.includes(scope.slice(0, -2)));
    if (!known)
      errors.push({ field: `scopes.${index}`, message: `Unknown scope. Use ${SCOPES.join(', ')}.` });
  });
  value.scopes = [...new Set(scopes)];

  if (body.expiresAt !== undefined) {
    const at = typeof body.expiresAt === 'string' ? Date.parse(body.expiresAt) : Number.NaN;
    if (Number.isNaN(at) || at <= Date.now())
      errors.push({ field: 'expiresAt', message: 'Use a time in the future.' });
    else value.expiresAt = new Date(at).toISOString();
  }
  checkLimits(body, value, errors);
  return { value, errors };
}

/** Checks an edit of limits: at least one of the two, each valid. */
export function checkKeyLimits(body: Record<string, unknown>): {
  value: CheckedKeyBody;
  errors: ProblemError[];
} {
  const errors: ProblemError[] = [];
  const value: CheckedKeyBody = {};
  if (body.rateLimitPerMin === undefined && body.allowedIps === undefined) {
    errors.push({ field: 'rateLimitPerMin', message: 'Send a limit or the allowed addresses.' });
  }
  checkLimits(body, value, errors);
  return { value, errors };
}

const KEY_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randomText = (length: number) =>
  Array.from({ length }, () => KEY_ALPHABET[Math.floor(Math.random() * KEY_ALPHABET.length)]).join('');

/** A new key's secret (`gsm_` and 44 characters) and the prefix kept for display (its first 8 characters). */
export function newSecret(): { secret: string; prefix: string } {
  const secret = `gsm_${randomText(44)}`;
  return { secret, prefix: secret.slice(0, 8) };
}
