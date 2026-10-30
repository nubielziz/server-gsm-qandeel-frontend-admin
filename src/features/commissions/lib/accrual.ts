// Small display helpers for accruals: the demo's "CA-0001" label and status badge (`caBadge` in 46-p-commissions.js) and the
// per-agent totals the approval dialog and the bulk strip show. The sums are for display; the server works out what it pays.
import type { BadgeProps } from '@/components/ui';
import { round, sum, toAmount } from '@/lib/format';
import type { CommissionAccrual, NamedRef } from '../types';

/** The accrual's visible number, as the demo showed it ("CA-0001"). */
export function accrualLabel(id: number): string {
  return `CA-${String(id).padStart(4, '0')}`;
}

/** How a status looks: the demo's Accrued (warn, clock) and Approved (good, check). Any other value is shown as it is. */
export function statusBadge(status: string): {
  tone: BadgeProps['tone'];
  icon: BadgeProps['icon'];
  label: string;
} {
  if (status === 'accrued') return { tone: 'warn', icon: 'clock', label: 'Accrued' };
  if (status === 'approved') return { tone: 'good', icon: 'checkCircle', label: 'Approved' };
  return { tone: 'neutral', icon: 'info', label: status };
}

/** The agent's name from the join, or its id while the server sends no join. */
export function agentName(accrual: Pick<CommissionAccrual, 'beneficiary' | 'beneficiaryId'>): string {
  return accrual.beneficiary?.name ?? `Merchant ${accrual.beneficiaryId}`;
}

/** What one agent is owed in a set of accruals. */
export type AgentTotal = NamedRef & { count: number; amount: number };

/** The accruals grouped by agent, the biggest amount first (the approval dialog's list). */
export function agentTotals(rows: readonly CommissionAccrual[]): AgentTotal[] {
  const byAgent = new Map<number, AgentTotal>();
  for (const row of rows) {
    const current = byAgent.get(row.beneficiaryId) ?? {
      id: row.beneficiaryId,
      name: agentName(row),
      count: 0,
      amount: 0,
    };
    current.count += 1;
    current.amount = round(current.amount + toAmount(row.amount), 4);
    byAgent.set(row.beneficiaryId, current);
  }
  return [...byAgent.values()].sort((a, b) => b.amount - a.amount);
}

/** The total of some accruals' commission, for display. */
export function totalOf(rows: readonly CommissionAccrual[]): number {
  return round(
    sum(rows, (row) => toAmount(row.amount)),
    4,
  );
}

/** "1 commission" or "3 commissions". */
export function commissionsText(count: number): string {
  return `${count} ${count === 1 ? 'commission' : 'commissions'}`;
}
