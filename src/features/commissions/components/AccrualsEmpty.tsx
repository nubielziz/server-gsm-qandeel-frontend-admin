// AccrualsEmpty: what the accruals table says when it has no rows. Ports the `empty` of accrualsTab in 46-p-commissions.js: "All caught
// up" on the Ready sub-filter when accruals exist, "No commissions yet" otherwise.
import { Button, EmptyState } from '@/components/ui';
import type { StatusFilter } from '../lib/filters';

export interface AccrualsEmptyProps {
  status: StatusFilter;
  /** Whether the server holds any accrual at all (the "All" count). */
  anyAccruals: boolean;
  onSeeApproved: () => void;
}

/** The empty state of the accruals table. */
export function AccrualsEmpty({ status, anyAccruals, onSeeApproved }: AccrualsEmptyProps) {
  if (status === 'accrued' && anyAccruals) {
    return (
      <EmptyState
        icon="checkCircle"
        title="All caught up"
        cta={<Button onClick={onSeeApproved}>See approved</Button>}
      >
        No commissions are waiting. New accruals appear when a referred merchant’s order completes.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="percent" title="No commissions yet">
      When a merchant referred by an agent completes an order, the agent earns a commission here.
    </EmptyState>
  );
}
