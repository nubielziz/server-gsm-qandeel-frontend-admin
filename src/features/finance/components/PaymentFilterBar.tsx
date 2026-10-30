// PaymentFilterBar: the Pending / Approved / Rejected / All switch with a count on each, and the note about card deposits.
// Ports the `seg` row of paymentsTab in 45-p-finance.js. A count shows once the server has answered it.
import type { PaymentCounts } from '../hooks/usePaymentCounts';
import { PAYMENT_FILTERS, type PaymentFilter } from '../lib/paymentView';

export interface PaymentFilterBarProps {
  value: PaymentFilter;
  counts: PaymentCounts;
  onChange: (filter: PaymentFilter) => void;
}

export function PaymentFilterBar({ value, counts, onChange }: PaymentFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3">
      <div className="seg" role="group" aria-label="Deposit status">
        {PAYMENT_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            aria-pressed={value === filter.id}
            onClick={() => onChange(filter.id)}
          >
            {filter.label} <span className="tabular-nums text-ink3">{counts[filter.id] ?? ''}</span>
          </button>
        ))}
      </div>
      <span className="flex-1" />
      <span className="text-xs text-ink3">Card deposits are credited on payment and skip review.</span>
    </div>
  );
}
