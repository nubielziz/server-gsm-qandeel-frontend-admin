// Where a journal entry came from, as a link back to the record: the order, the deposit or the invoice. The demo showed the
// reference only as text (`refType` / `refId` in the journal); the console adds the link in the entry's drawer.
import { financeInvoicePath, financePaymentPath } from './tabs';
import { paymentLabel } from './payments';

/** The record an entry is about and the address that opens it, or null for references with no page of their own. */
export function referenceLink(refType: string, refId: number): { label: string; to: string } | null {
  if (refId <= 0) return null;
  switch (refType) {
    case 'order':
      return { label: `Order #${refId}`, to: `/orders?order=${refId}` };
    case 'payment':
      return { label: `Deposit ${paymentLabel(refId)}`, to: financePaymentPath(refId) };
    case 'invoice':
      return { label: `Invoice #${refId}`, to: financeInvoicePath(refId) };
    default:
      return null;
  }
}
