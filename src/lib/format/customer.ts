// Customer display name for the whole console. A customer may have an empty name (sign-in link or checkout without one),
// so every screen that shows "who" goes through `customerLabel` and never prints `customer.name` alone.
import { maskEmail } from './text';

/** The parts of a customer the label can use. Every part is optional because some rows carry only `{ id, name }`. */
export type CustomerLabelSource = { name?: string | null; email?: string | null; id?: number | null };

const text = (value: string | null | undefined): string => (typeof value === 'string' ? value.trim() : '');

/**
 * Whether the customer has a real name (not empty, not only spaces). The customer table uses it to show a muted
 * "No name" line instead of printing the email twice.
 */
export function hasCustomerName(customer: CustomerLabelSource | null | undefined): boolean {
  return text(customer?.name) !== '';
}

/**
 * The text that stands for a customer on screen: the trimmed name, else the trimmed email, else `Customer #<id>`, else
 * `Unknown customer`. Display only: forms and request bodies keep the raw name so an empty name stays empty.
 */
export function customerLabel(customer: CustomerLabelSource | null | undefined): string {
  const name = text(customer?.name);
  if (name) return name;
  const email = text(customer?.email);
  if (email) return email;
  const id = customer?.id;
  if (typeof id === 'number' && Number.isFinite(id)) return `Customer #${id}`;
  return 'Unknown customer';
}

/**
 * `customerLabel` for the screens that mask emails (finance, orders, risk): the email fallback is masked the same way, so a
 * customer with no name is not shown with a full address on a screen that hides it everywhere else.
 */
export function maskedCustomerLabel(customer: CustomerLabelSource | null | undefined): string {
  const email = text(customer?.email);
  return customerLabel({ ...customer, email: email ? maskEmail(email) : null });
}
