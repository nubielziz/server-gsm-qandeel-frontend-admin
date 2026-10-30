// Where "Open record" leads for each kind of record. Ports auditEntity / aud-go of 47-p-audit.js, using the deep links of
// ARCHITECTURE §5.2. A record the console has no page for (a deposit, a ticket, a setting) gets no link, and neither does
// an entry whose id is 0 (the server had no record to point at).
import { customerPath } from '@/features/customers';
import { merchantPath } from '@/features/merchants';
import { refundsPath } from '@/features/refunds';
import { servicesListPath } from '@/features/services';
import { supplierPath } from '@/features/suppliers';
import { entityKind } from './entities';

/** The console pages an entry can lead to, named like the page resources (they decide whether the staff member may open it). */
export type RecordPage =
  'orders' | 'merchants' | 'customers' | 'suppliers' | 'services' | 'risk' | 'refunds' | 'access';

/** An order opens its drawer here (`?order=<id>`, shown by `OrderDrawerHost`); every other record is a link to its page. */
export type RecordTarget =
  { page: 'orders'; orderId: number } | { page: Exclude<RecordPage, 'orders'>; to: string };

/** The blocklist is a tab of the Risk page (ARCHITECTURE §5.2: `/risk?tab=…`). */
export const BLOCKLIST_PATH = '/risk?tab=block';

/** The Admin accounts tab of the access page. */
export const ADMINS_PATH = '/access?tab=admins';

/**
 * The target of an entry's record, or null when there is nothing to open. `label` is the record's name: the Services
 * page has no address for one service, so the link searches for it by name, as the demo does.
 */
export function recordTarget(
  entityType: string,
  entityId: number,
  label: string | null | undefined,
): RecordTarget | null {
  const id = Number.isInteger(entityId) && entityId > 0 ? entityId : null;
  const name = label?.trim() ?? '';
  switch (entityKind(entityType)) {
    case 'order':
      return id === null ? null : { page: 'orders', orderId: id };
    case 'merchant':
      return id === null ? null : { page: 'merchants', to: merchantPath(id) };
    case 'customer':
      return id === null ? null : { page: 'customers', to: customerPath(id) };
    case 'supplier':
      return id === null ? null : { page: 'suppliers', to: supplierPath(id) };
    case 'service':
      return { page: 'services', to: servicesListPath(name ? { q: name } : {}) };
    case 'blocklist':
      return { page: 'risk', to: BLOCKLIST_PATH };
    case 'refund':
      return { page: 'refunds', to: refundsPath({ tab: 'refunds' }) };
    case 'dispute':
      return { page: 'refunds', to: refundsPath({ tab: 'disputes' }) };
    case 'staff':
      return { page: 'access', to: ADMINS_PATH };
    default:
      return null;
  }
}
