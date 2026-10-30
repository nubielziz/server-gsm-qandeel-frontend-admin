// Which pages the staff member may open, so "Open record" is only offered where it leads somewhere. A hint only: the page
// checks again, and so does the server.
import { useCanOpenPage } from '@/lib/auth/useCanOpenPage';
import type { RecordPage } from '../lib/link';

/** A function that answers for a page name. It says no until the access-control provider has answered. */
export function useRecordAccess(): (page: RecordPage) => boolean {
  // One call per page, written out: a hook cannot be called in a loop.
  const allowed: Record<RecordPage, boolean> = {
    orders: useCanOpenPage('orders') === true,
    merchants: useCanOpenPage('merchants') === true,
    customers: useCanOpenPage('customers') === true,
    suppliers: useCanOpenPage('suppliers') === true,
    services: useCanOpenPage('services') === true,
    risk: useCanOpenPage('risk') === true,
    refunds: useCanOpenPage('refunds') === true,
    access: useCanOpenPage('access') === true,
  };
  return (page) => allowed[page];
}
