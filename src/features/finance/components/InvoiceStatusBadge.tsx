// InvoiceStatusBadge: the state of an invoice as a badge (icon + word). New in the console (MISMATCHES M123).
import { Badge } from '@/components/ui';
import { invoiceStatusBadge } from '../lib/invoices';

export function InvoiceStatusBadge({ status }: { status: string }) {
  const badge = invoiceStatusBadge(status);
  return (
    <Badge tone={badge.tone} icon={badge.icon}>
      {badge.label}
    </Badge>
  );
}
