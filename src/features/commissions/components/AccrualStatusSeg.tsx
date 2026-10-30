// AccrualStatusSeg: the Ready / Approved / All buttons above the accruals, each with the server's count. Ports the `seg` of accrualsTab
// in 46-p-commissions.js (the kit's SegmentedControl has no room for a count beside the label).
import { num } from '@/lib/format';
import type { AccrualCounts } from '../hooks/useAccrualCounts';
import { STATUS_ITEMS, type StatusFilter } from '../lib/filters';

export interface AccrualStatusSegProps {
  value: StatusFilter;
  counts: AccrualCounts;
  onChange: (value: StatusFilter) => void;
}

const COUNT_OF: Record<StatusFilter, keyof AccrualCounts> = {
  accrued: 'ready',
  approved: 'approved',
  all: 'all',
};

/** The status sub-filter. A count that has not arrived yet is left out. */
export function AccrualStatusSeg({ value, counts, onChange }: AccrualStatusSegProps) {
  return (
    <div className="seg" role="group" aria-label="Accrual status">
      {STATUS_ITEMS.map((item) => {
        const count = counts[COUNT_OF[item.value]];
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={item.value === value}
            onClick={() => onChange(item.value)}
          >
            {item.label}
            {count !== undefined && <span className="ms-1 tabular-nums text-ink3">{num(count)}</span>}
          </button>
        );
      })}
    </div>
  );
}
