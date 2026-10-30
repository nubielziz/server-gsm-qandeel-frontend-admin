// AuditEmpty: what the list says when there is nothing to show: no entry matches the filters, or nothing was ever recorded.
// Ports the two `emptyBlock`s of pageAudit in 47-p-audit.js.
import { Button, EmptyState } from '@/components/ui';

export function AuditEmpty({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  if (filtered) {
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
    <EmptyState icon="history" title="Nothing recorded yet">
      Every change to prices, balances, merchants and suppliers is written here with the person and the time.
    </EmptyState>
  );
}
