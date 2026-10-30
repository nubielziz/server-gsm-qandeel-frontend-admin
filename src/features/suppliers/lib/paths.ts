// The address of a supplier on the Suppliers page. `/suppliers?supplier=<id>` is the deep link other pages use (the dashboard's
// supplier rows and alerts, ARCHITECTURE §5.2); the page keeps its selection in the same parameter.
import type { Id } from '@/lib/api';

/** The query parameter that holds the selected supplier. */
export const SUPPLIER_PARAM = 'supplier';

/** The address that opens the Suppliers page with this supplier selected. */
export function supplierPath(id: Id): string {
  return `/suppliers?${SUPPLIER_PARAM}=${id}`;
}

/** The supplier id in the address, or null when it is missing or not a whole number. */
export function parseSupplierParam(params: URLSearchParams): Id | null {
  const raw = params.get(SUPPLIER_PARAM);
  return raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
}
