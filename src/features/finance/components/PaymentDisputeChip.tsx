// PaymentDisputeChip: the chip that says a top-up has a chargeback and where it stands (feature 21): a word and an icon, never a colour alone.
import { Badge } from '@/components/ui';
import { disputeChip } from '../lib/payments';
import type { PaymentDispute } from '../types';

/** The chargeback chip of a top-up row or dialog. */
export function PaymentDisputeChip({ dispute }: { dispute: Pick<PaymentDispute, 'status'> }) {
  const chip = disputeChip(dispute);
  return (
    <Badge tone={chip.tone} icon={chip.icon}>
      {chip.label}
    </Badge>
  );
}
