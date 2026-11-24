// Display names of the people behind a record for the whole console. A person may have an empty name (sign-in link or checkout
// without one), so every screen that shows "who" goes through `accountLabel` (or `customerLabel` for an old customer row) and never
// prints `name` alone. One account type carries both merchants and shop buyers, so `accountLabel` is the one to use.
import { maskEmail } from './text';

/** The parts of a customer the label can use. Every part is optional because some rows carry only `{ id, name }`. */
export type CustomerLabelSource = { name?: string | null; email?: string | null; id?: number | null };

const text = (value: string | null | undefined): string => (typeof value === 'string' ? value.trim() : '');

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

/** The parts of an account the label can use. Every part is optional because some rows carry only `{ id, name }`. */
export type AccountLabelSource = {
  name?: string | null;
  email?: string | null;
  id?: number | null;
  status?: string | null;
};

/** The name an account shows once it was anonymized, whatever its row still holds. */
export const ANONYMIZED_ACCOUNT_LABEL = 'Deleted account';

/** Whether the account has a real name (not empty, not only spaces). */
export function hasAccountName(account: AccountLabelSource | null | undefined): boolean {
  return text(account?.name) !== '';
}

/**
 * The text that stands for an account on screen: "Deleted account" once anonymized, else the trimmed name, else the trimmed email,
 * else `Account #<id>`, else `Unknown account`. Display only: forms and request bodies keep the raw name so an empty name stays empty.
 */
export function accountLabel(account: AccountLabelSource | null | undefined): string {
  if (account?.status === 'anonymized') return ANONYMIZED_ACCOUNT_LABEL;
  const name = text(account?.name);
  if (name) return name;
  const email = text(account?.email);
  if (email) return email;
  const id = account?.id;
  if (typeof id === 'number' && Number.isFinite(id)) return `Account #${id}`;
  return 'Unknown account';
}

/**
 * `accountLabel` for the screens that mask emails (finance, orders, risk): the email fallback is masked the same way, so an account
 * with no name is not shown with a full address on a screen that hides it everywhere else.
 */
export function maskedAccountLabel(account: AccountLabelSource | null | undefined): string {
  const email = text(account?.email);
  return accountLabel({ ...account, email: email ? maskEmail(email) : null });
}
