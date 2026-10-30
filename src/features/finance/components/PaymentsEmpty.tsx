// PaymentsEmpty: what the Deposits table says when there are no rows: none waiting (with a way to see them all), or none
// ever. Ports the `empty` ladder of paymentsTab in 45-p-finance.js.
import { Button, EmptyState } from '@/components/ui';
import type { PaymentFilter } from '../lib/paymentView';

export interface PaymentsEmptyProps {
  filter: PaymentFilter;
  /** Some deposit exists, whatever its status (the All count is above zero). */
  anyDeposits: boolean;
  onShowAll: () => void;
}

export function PaymentsEmpty({ filter, anyDeposits, onShowAll }: PaymentsEmptyProps) {
  if (filter === 'pending' && anyDeposits) {
    return (
      <EmptyState
        icon="checkCircle"
        title="No deposits waiting"
        cta={<Button onClick={onShowAll}>See all deposits</Button>}
      >
        Bank, USDT and Wise deposits appear here until someone checks the proof of payment. Card deposits are
        credited automatically.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="receipt" title="No deposits yet">
      When a merchant pays by bank, USDT, Wise or card it shows up here.
    </EmptyState>
  );
}
