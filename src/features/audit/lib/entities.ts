// The kinds of record an audit entry can be about: their names on screen, and how the server's `entityType` is read.
// Ports TYPE_LABEL of 47-p-audit.js. The map does not list the `entityType` values (assumed contract: the singular names
// below); table names such as `orders` or `staff_users` are accepted too, so a server that sends those still reads well.
// An account is one kind of record: new rows say `account`, and rows written before the merge say `merchant` or `customer`;
// all three read as "Account" and the one filter "Account" lists them together.
import type { AuditLog } from '../types';

/** The demo's record types and their names, in the words of the record-type filter. */
export const ENTITY_LABEL: Readonly<Record<string, string>> = {
  account: 'Account',
  order: 'Order',
  service: 'Service',
  supplier: 'Supplier',
  payment: 'Deposit',
  withdrawal: 'Withdrawal',
  session: 'Session',
  staff: 'Admin',
  ip_rule: 'IP rule',
  checkout: 'Checkout',
  refund: 'Refund',
  dispute: 'Dispute',
  ticket: 'Ticket',
  listing: 'Storefront',
  blocklist: 'Blocklist',
  legal: 'Legal document',
  setting: 'Setting',
};

/** The record types the filter offers. */
export const ENTITY_KINDS: readonly string[] = Object.keys(ENTITY_LABEL);

// Other names the server might use for the same record (table names, and the demo's own `admin` and `access`).
const ALIASES: Readonly<Record<string, string>> = {
  accounts: 'account',
  client: 'account',
  clients: 'account',
  merchant: 'account',
  merchants: 'account',
  customer: 'account',
  customers: 'account',
  admin: 'staff',
  admins: 'staff',
  staff_user: 'staff',
  staff_users: 'staff',
  access: 'ip_rule',
  ip_rules: 'ip_rule',
  support_ticket: 'ticket',
  support_tickets: 'ticket',
  service_listing: 'listing',
  service_listings: 'listing',
  legal_document: 'legal',
  legal_documents: 'legal',
  checkout_session: 'checkout',
  checkout_sessions: 'checkout',
  blocklist_entry: 'blocklist',
  blocklist_entries: 'blocklist',
  settings: 'setting',
};

/**
 * The console's name for a server `entityType`: `orders` and `order` are both `order`, `staff_users` is `staff`. A type the
 * console does not know comes back as it was (lower case, with `_` for spaces and dashes).
 */
export function entityKind(entityType: string): string {
  const key = entityType
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (Object.hasOwn(ENTITY_LABEL, key)) return key;
  if (Object.hasOwn(ALIASES, key)) return ALIASES[key];
  const singular = key.endsWith('s') ? key.slice(0, -1) : key;
  return Object.hasOwn(ENTITY_LABEL, singular) ? singular : key;
}

/**
 * True for the old word `customer`: a row that says it carries the number of the old customer record, which is not an account
 * number (the account has a new number). Every other word of an account (`account`, `merchant`, `client`) carries the account's own number.
 */
export function isOldCustomerWord(entityType: string): boolean {
  const key = entityType
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return key === 'customer' || key === 'customers';
}

/** "ip_rule" as "Ip rule": the name of a record type the console has no word for. */
function titleCase(key: string): string {
  const words = key.replace(/_/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

/** The name of a record type on screen ("Deposit", "Admin"). */
export function entityTypeLabel(entityType: string): string {
  const kind = entityKind(entityType);
  return Object.hasOwn(ENTITY_LABEL, kind) ? ENTITY_LABEL[kind] : titleCase(kind);
}

/** What to call the record of an entry: the name the server saved with it, else "Order #4812". */
export function recordText(row: Pick<AuditLog, 'entityType' | 'entityId' | 'entityLabel'>): string {
  const label = row.entityLabel?.trim();
  if (label) return label;
  return row.entityId
    ? `${entityTypeLabel(row.entityType)} #${row.entityId}`
    : entityTypeLabel(row.entityType);
}
