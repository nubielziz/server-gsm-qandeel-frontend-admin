// Where "Open record" leads for each kind of record. Ports auditEntity / aud-go of 47-p-audit.js, using the deep links of
// ARCHITECTURE §5.2. A record the console has no page for (a deposit, a ticket, a setting) gets no link, and neither does
// an entry whose id is 0 (the server had no record to point at).
import { accountPath, legacyAccountPath } from '@/features/accounts';
import type { MoneyViewId } from '@/features/money';
import { refundsPath } from '@/features/refunds';
import { productsPath } from '@/features/services';
import { supplierPath } from '@/features/suppliers';
import type { Id } from '@/lib/api';
import { entityKind, isOldCustomerWord } from './entities';

/** The console pages an entry can lead to, named like the page resources (they decide whether the staff member may open it). */
export type RecordPage = 'orders' | 'accounts' | 'suppliers' | 'products' | 'risk' | 'money' | 'access';

/**
 * An order opens its drawer here (`?order=<id>`, shown by `OrderDrawerHost`); every other record is a link to its page. A record on
 * the Money page also names its `view` (a refund, a dispute): that page opens for many permissions, so the link needs the view's own.
 */
export type RecordTarget =
  | { page: 'orders'; orderId: number }
  | { page: Exclude<RecordPage, 'orders'>; to: string; view?: MoneyViewId };

/** The blocklist is a tab of the Risk page (ARCHITECTURE §5.2: `/risk?tab=…`). */
export const BLOCKLIST_PATH = '/risk?tab=block';

/** The Admin accounts tab of the access page. */
export const ADMINS_PATH = '/access?tab=admins';

/** Whether the staff member may open a page, and the Money view a record sits on when it has one (a hint only; the page checks again). */
export type RecordAccess = (page: RecordPage, view?: MoneyViewId) => boolean;

/** A number that can name a record: a whole number above zero. */
const idOf = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;

/**
 * The target of an entry's record, or null when there is nothing to open. `label` is the record's name: it names the search of a
 * service that has no id (the demo opened the services table searched by the name); a service with an id opens its edit view.
 * `account` is the account the server resolved for the row (`account: { id }`): an account record opens through it. Without it
 * the number of the row is used as it is for `account`, `merchant` and `client` (those keep the account's number), and an old
 * `customer` row goes through the lookup of the Accounts page (`legacyAccountPath`), because its number belongs to the old
 * customer record and must never be read as an account number.
 */
export function recordTarget(
  entityType: string,
  entityId: number,
  label: string | null | undefined,
  account?: { id: Id } | null,
): RecordTarget | null {
  const id = idOf(entityId);
  const name = label?.trim() ?? '';
  switch (entityKind(entityType)) {
    case 'order':
      return id === null ? null : { page: 'orders', orderId: id };
    case 'account': {
      const resolved = idOf(account?.id);
      if (resolved !== null) return { page: 'accounts', to: accountPath(resolved) };
      if (id === null) return null;
      return {
        page: 'accounts',
        to: isOldCustomerWord(entityType) ? legacyAccountPath('customer', id) : accountPath(id),
      };
    }
    case 'supplier':
      return id === null ? null : { page: 'suppliers', to: supplierPath(id) };
    case 'service':
      // The edit view of the service (it shows the service's own kind on the strip); a record with no id opens the list, searched by its name.
      return {
        page: 'products',
        to:
          id === null
            ? productsPath({ view: 'all', q: name || undefined })
            : productsPath({ view: 'edit', id }),
      };
    case 'blocklist':
      return { page: 'risk', to: BLOCKLIST_PATH };
    case 'refund':
      return { page: 'money', to: refundsPath({ tab: 'refunds' }), view: 'refunds' };
    case 'dispute':
      return { page: 'money', to: refundsPath({ tab: 'disputes' }), view: 'disputes' };
    case 'staff':
      return { page: 'access', to: ADMINS_PATH };
    default:
      return null;
  }
}
