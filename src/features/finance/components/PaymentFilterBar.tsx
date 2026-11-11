// PaymentFilterBar: the Pending / Approved / Rejected / All switch with a count on each, and the note about card deposits.
// Ports the `seg` row of paymentsTab in 45-p-finance.js. A count shows once the server has answered it. Since feature 21 a select
// keeps merchants' deposits or customers' store balance top-ups only.
import { SelectField } from '@/components/ui';
import type { PaymentCounts } from '../hooks/usePaymentCounts';
import {
  PAYMENT_FILTERS,
  PAYMENT_OWNERS,
  type PaymentFilter,
  type PaymentOwnerFilter,
} from '../lib/paymentView';

const OWNER_OPTIONS = PAYMENT_OWNERS.map((owner) => ({ value: owner.id, label: owner.label }));

export interface PaymentFilterBarProps {
  value: PaymentFilter;
  counts: PaymentCounts;
  onChange: (filter: PaymentFilter) => void;
  /** Whose top-ups are listed (feature 21). */
  owner: PaymentOwnerFilter;
  onOwnerChange: (owner: PaymentOwnerFilter) => void;
}

export function PaymentFilterBar({ value, counts, onChange, owner, onOwnerChange }: PaymentFilterBarProps) {
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
      <SelectField
        aria-label="Filter by payer"
        value={owner}
        options={OWNER_OPTIONS}
        onChange={(event) => onOwnerChange(event.target.value as PaymentOwnerFilter)}
      />
      <span className="flex-1" />
      <span className="text-xs text-ink3">Card deposits are credited on payment and skip review.</span>
    </div>
  );
}
