// PaymentStatusBadge: the state of a deposit as a badge (icon + word). Ports payBadge of 45-p-finance.js. Exported for the
// pages that show deposits (the audit log links to them).
import { Badge } from '@/components/ui';
import { paymentStatusBadge } from '../lib/payments';

export function PaymentStatusBadge({ status }: { status: string }) {
  const badge = paymentStatusBadge(status);
  return (
    <Badge tone={badge.tone} icon={badge.icon}>
      {badge.label}
    </Badge>
  );
}
