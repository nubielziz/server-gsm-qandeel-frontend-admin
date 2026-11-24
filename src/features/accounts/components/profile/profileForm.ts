// The form of the Profile part: what the boxes start with, how what was typed is cleaned, and which fields really changed. The limits are
// hints only: the server validates everything and its field messages show under the same boxes. One form for a merchant rank and a
// retail rank (it replaces the two edit dialogs of the old pages).
import type { AccountDetails, AccountRow } from '../../types';

/** The limits of the server's contract, used for the form's hints and checks. */
export const PROFILE_LIMITS = {
  name: 120,
  company: 160,
  phone: 40,
  address: 300,
  taxId: 40,
  internalNotes: 2000,
} as const;

/** The boxes of the form, as typed. */
export type ProfileValues = {
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  address: string;
  taxId: string;
  internalNotes: string;
};

/** The names of the boxes, so a server message about any other field shows in the error slot instead of under a box. */
export const PROFILE_FIELDS: readonly string[] = [
  'name',
  'email',
  'phone',
  'country',
  'company',
  'address',
  'taxId',
  'internalNotes',
];

/** The parts of an account the form works from. */
export type ProfileSource = Pick<
  AccountRow,
  'name' | 'email' | 'phone' | 'country' | 'company' | 'address' | 'taxId' | 'internalNotes'
>;

/** What the boxes start with: the account's own values; a value the server did not send is empty. */
export function profileDefaults(account: ProfileSource): ProfileValues {
  return {
    name: account.name ?? '',
    email: account.email ?? '',
    phone: account.phone ?? '',
    country: account.country ?? '',
    company: account.company ?? '',
    address: account.address ?? '',
    taxId: account.taxId ?? '',
    internalNotes: account.internalNotes ?? '',
  };
}

/** A name with the spaces tidied: trimmed, and every run of spaces made one (the server does the same). */
export function tidyName(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** An email as sent: trimmed and in lower case, so "Ops@Shop.example " and "ops@shop.example" are one address. */
export function cleanEmail(text: string): string {
  return text.trim().toLowerCase();
}

/** A rough shape check (something@something.xx); the server decides what is a real address. */
export function validEmail(text: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text.trim());
}

/** A country as sent: two letters, in upper case ("jo" is "JO"). */
export function cleanCountry(text: string): string {
  return text.trim().toUpperCase();
}

/** Whether a country is two letters. */
export function validCountry(text: string): boolean {
  return /^[A-Za-z]{2}$/.test(text.trim());
}

/** A hint for a text longer than the server allows, or undefined when it fits. */
export function tooLong(text: string, limit: number): string | undefined {
  return text.trim().length > limit ? `Use at most ${limit} characters.` : undefined;
}

/** What the part may not send. A locked email (a login account without `clients:security`) never goes in the body. */
export type ProfileLocks = { email?: boolean };

/**
 * The fields that really changed, as the body of the request, cleaned: the name tidied, the email compared without case and sent in
 * lower case, the country sent in upper case, an emptied optional field sent as an empty string so the server clears it. An empty result
 * means nothing changed and no request is made.
 */
export function profileBody(
  account: ProfileSource,
  values: ProfileValues,
  locks: ProfileLocks = {},
): AccountDetails {
  const start = profileDefaults(account);
  const body: AccountDetails = {};
  const name = tidyName(values.name);
  if (name !== tidyName(start.name)) body.name = name;
  const email = cleanEmail(values.email);
  if (!locks.email && email !== cleanEmail(start.email)) body.email = email;
  const phone = values.phone.trim();
  if (phone !== start.phone.trim()) body.phone = phone;
  const country = cleanCountry(values.country);
  if (country !== cleanCountry(start.country)) body.country = country;
  const company = values.company.trim();
  if (company !== start.company.trim()) body.company = company;
  const address = values.address.trim();
  if (address !== start.address.trim()) body.address = address;
  const taxId = values.taxId.trim();
  if (taxId !== start.taxId.trim()) body.taxId = taxId;
  const notes = values.internalNotes.trim();
  if (notes !== start.internalNotes.trim()) body.internalNotes = notes;
  return body;
}
