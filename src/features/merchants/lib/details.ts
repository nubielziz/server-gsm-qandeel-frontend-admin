// The editable details of a merchant (Profile tab, "Edit details"): the form's values, how they are cleaned, and which of them
// really changed. Hints only: the server validates everything and its field messages show under the same fields (decision 008).
import type { Client, ClientDetails, ClientLocale } from '../types';

/** The two languages a merchant can use (`clients.locale`). */
export const LOCALES: readonly { value: ClientLocale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
];

/** The language's name, or the code when it is not one the console knows. */
export function localeLabel(locale: string | undefined): string {
  return LOCALES.find((option) => option.value === locale)?.label ?? locale ?? '–';
}

/** The limits of the server's contract, used for the form's hints. */
export const DETAIL_LIMITS = {
  name: 120,
  company: 160,
  phone: 40,
  address: 300,
  taxId: 40,
  internalNotes: 2000,
} as const;

/** The fields of the edit dialog, as typed. */
export type DetailValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  locale: ClientLocale;
  address: string;
  taxId: string;
  internalNotes: string;
};

type Editable = Pick<
  Client,
  'name' | 'company' | 'email' | 'phone' | 'country' | 'locale' | 'address' | 'taxId' | 'internalNotes'
>;

/** What the dialog starts with: the merchant's own values; a value the server did not send is empty (the language: English). */
export function detailDefaults(client: Editable): DetailValues {
  return {
    name: client.name,
    company: client.company,
    email: client.email,
    phone: client.phone,
    country: client.country,
    locale: client.locale ?? 'en',
    address: client.address ?? '',
    taxId: client.taxId ?? '',
    internalNotes: client.internalNotes ?? '',
  };
}

/** A name with the spaces tidied: trimmed, and every run of spaces made one (the server does the same). */
export function tidyName(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * The details that really changed, as the body of the request. An empty result means nothing changed and no request is made.
 * The email is compared without case (only the address matters) and sent in lower case; the country is sent in upper case.
 */
export function changedDetails(client: Editable, values: DetailValues): ClientDetails {
  const start = detailDefaults(client);
  const body: ClientDetails = {};
  const name = tidyName(values.name);
  if (name !== start.name) body.name = name;
  const company = values.company.trim();
  if (company !== start.company.trim()) body.company = company;
  const email = values.email.trim().toLowerCase();
  if (email !== start.email.trim().toLowerCase()) body.email = email;
  const phone = values.phone.trim();
  if (phone !== start.phone.trim()) body.phone = phone;
  const country = values.country.trim().toUpperCase();
  if (country !== start.country.trim().toUpperCase()) body.country = country;
  if (values.locale !== start.locale) body.locale = values.locale;
  const address = values.address.trim();
  if (address !== start.address.trim()) body.address = address;
  const taxId = values.taxId.trim();
  if (taxId !== start.taxId.trim()) body.taxId = taxId;
  const notes = values.internalNotes.trim();
  if (notes !== start.internalNotes.trim()) body.internalNotes = notes;
  return body;
}

/** A hint for a text longer than the server allows, or undefined when it fits. */
export function tooLong(text: string, limit: number): string | undefined {
  return text.trim().length > limit ? `Use at most ${limit} characters.` : undefined;
}
