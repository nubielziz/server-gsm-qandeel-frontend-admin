// LedgerEmpty: what the ledger table says when there are no rows: nothing matches the filters, or nothing was ever posted.
// Ports the `empty` ladder of ledgerTab in 45-p-finance.js.
import { Button, EmptyState } from '@/components/ui';

export function LedgerEmpty({ filtersOn, onClear }: { filtersOn: boolean; onClear: () => void }) {
  if (filtersOn) {
    return (
      <EmptyState
        icon="filter"
        title="No entries match"
        cta={<Button onClick={onClear}>Clear filters</Button>}
      >
        Try another search or remove a filter.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="receipt" title="No ledger entries yet">
      Deposits, order holds and payouts are posted here as they happen. Each entry balances to zero.
    </EmptyState>
  );
}
