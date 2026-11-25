// Which pages the staff member may open, so "Open record" is only offered where it leads somewhere. A hint only: the page
// checks again, and so does the server.
import { useMe } from '@/features/auth';
import { canUseView, viewSpec } from '@/features/money';
import { useCanOpenPage } from '@/lib/auth/useCanOpenPage';
import type { RecordAccess, RecordPage } from '../lib/link';

/**
 * A function that answers for a page name, and for a Money view when the record sits on one (a refund, a dispute: the Money page
 * opens for many permissions, so the link needs the view's own too). It says no until the access-control provider has answered.
 */
export function useRecordAccess(): RecordAccess {
  const { data: me } = useMe();
  // One call per page, written out: a hook cannot be called in a loop.
  const allowed: Record<RecordPage, boolean> = {
    orders: useCanOpenPage('orders') === true,
    accounts: useCanOpenPage('accounts') === true,
    suppliers: useCanOpenPage('suppliers') === true,
    products: useCanOpenPage('products') === true,
    risk: useCanOpenPage('risk') === true,
    money: useCanOpenPage('money') === true,
    access: useCanOpenPage('access') === true,
  };
  return (page, view) =>
    allowed[page] && (view === undefined || (me !== undefined && canUseView(viewSpec(view), me.permissions)));
}
