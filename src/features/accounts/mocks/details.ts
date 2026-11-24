// The checks the mock makes on the details of `PATCH /admin/clients/:id` (name, company, phone, country, email, address, tax ID,
// internal notes), with the limits of the backend's contract. Mock only: the real rules are the server's (decision 014).
import type { ProblemError } from '@/mocks/problem';
import type { AccountDetails } from '../types';
import { textOf } from './shared';

/** The eight keys of a details change, in the order the server reads them. */
export const DETAIL_KEYS = [
  'name',
  'company',
  'phone',
  'country',
  'email',
  'address',
  'taxId',
  'internalNotes',
] as const satisfies readonly (keyof AccountDetails)[];

const LIMITS = { company: 160, phone: 40, address: 300, taxId: 40, internalNotes: 2000 } as const;

/**
 * Cleans the details of a body the way the server does (trim, name spaces collapsed, country upper-cased, email lower-cased) and
 * returns them, or one message per field that breaks a limit.
 */
export function checkDetails(body: Record<string, unknown>): AccountDetails | { errors: ProblemError[] } {
  const errors: ProblemError[] = [];
  const out: AccountDetails = {};
  const fail = (field: string, message: string) => errors.push({ field, message });

  if (body.name !== undefined) {
    const name = textOf(body.name).replace(/\s+/g, ' ');
    if (!name) fail('name', 'Enter a name.');
    else if (name.length > 120) fail('name', 'Use at most 120 characters.');
    else out.name = name;
  }
  for (const key of ['company', 'phone', 'address', 'taxId', 'internalNotes'] as const) {
    if (body[key] === undefined) continue;
    const value = textOf(body[key]);
    if (value.length > LIMITS[key]) fail(key, `Use at most ${LIMITS[key]} characters.`);
    else out[key] = value;
  }
  if (body.country !== undefined) {
    const country = textOf(body.country).toUpperCase();
    if (/^[A-Z]{2}$/.test(country)) out.country = country;
    else fail('country', 'Enter the two-letter country code.');
  }
  if (body.email !== undefined) {
    const email = textOf(body.email).toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) out.email = email;
    else fail('email', 'Enter a valid email address.');
  }
  return errors.length > 0 ? { errors } : out;
}
