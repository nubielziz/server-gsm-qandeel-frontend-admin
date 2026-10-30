// ApproveBar: the strip above the accruals when rows are ticked: how many, the amount and the agents, then Clear and "Approve N".
// Ports the `bar` of accrualsTab in 46-p-commissions.js. The amount is added for display; the server pays what it approves.
import { Button, Icon } from '@/components/ui';
import { money } from '@/lib/format';
import { agentTotals, totalOf } from '../lib/accrual';
import type { CommissionAccrual } from '../types';

export interface ApproveBarProps {
  /** How many accruals are ticked. */
  count: number;
  /** The ticked accruals whose rows are known. */
  rows: readonly CommissionAccrual[];
  lock: { disabled: boolean; title?: string };
  onClear: () => void;
  onApprove: () => void;
}

/** Shown only while some accruals are ticked. */
export function ApproveBar({ count, rows, lock, onClear, onApprove }: ApproveBarProps) {
  if (count === 0) return null;
  const agents = agentTotals(rows).length;
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-t border-line bg-accent-soft px-3.5 py-2"
      role="region"
      aria-label="Bulk actions"
    >
      <span className="text-sm font-medium text-accent-ink">{count} selected</span>
      <span className="text-xs text-ink2">
        {money(totalOf(rows))} to {agents} {agents === 1 ? 'agent' : 'agents'}
      </span>
      <span className="flex-1" />
      <Button size="sm" onClick={onClear}>
        Clear
      </Button>
      <Button size="sm" variant="primary" disabled={lock.disabled} title={lock.title} onClick={onApprove}>
        <Icon name="check" className="ic-sm" />
        Approve {count}
      </Button>
    </div>
  );
}
