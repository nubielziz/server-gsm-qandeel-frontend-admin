// Input helpers for the customer dialogs: cleaning what was typed, the email check, and which fields of an edit really changed.
// Ports the input handling of createCustomer and updateCustomer in 12-state-b2c.js. The server still validates everything.
import type { Customer, UpdateCustomerBody } from '../types';

/** A name with the spaces tidied: trimmed, and every run of spaces made one. */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** An email as it is stored: trimmed and in lower case. */
export function cleanEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** A rough shape check (something@something.xx); the server decides what is a real address. */
export function validEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim());
}

/** The fields of the edit dialog, as typed. */
export type EditValues = {
  name: string;
  email: string;
  country: string;
  locale: string;
  phone: string;
  internalNotes: string;
};

/**
 * The fields of an edit that really changed, in the demo's order. An empty result means nothing changed, and the dialog then
 * sends no request at all. The email is compared without case: only the address matters, not how it was typed.
 */
export function changedFields(
  customer: Pick<Customer, 'name' | 'email' | 'country' | 'locale' | 'phone' | 'internalNotes'>,
  form: EditValues,
): UpdateCustomerBody {
  const body: UpdateCustomerBody = {};
  const name = cleanName(form.name);
  if (name !== customer.name) body.name = name;
  const email = cleanEmail(form.email);
  if (email !== customer.email.toLowerCase()) body.email = email;
  if (form.country !== customer.country) body.country = form.country;
  if (form.locale !== customer.locale) body.locale = form.locale;
  const phone = form.phone.trim();
  if (phone !== customer.phone.trim()) body.phone = phone;
  const notes = form.internalNotes.trim();
  if (notes !== customer.internalNotes.trim()) body.internalNotes = notes;
  return body;
}
