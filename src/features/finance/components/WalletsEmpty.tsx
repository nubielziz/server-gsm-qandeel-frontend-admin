// WalletsEmpty: what the store balances table says when there are no rows: nothing matches the filters, or no account has a balance yet.
import { Button, EmptyState } from '@/components/ui';

export function WalletsEmpty({ filtersOn, onClear }: { filtersOn: boolean; onClear: () => void }) {
  if (filtersOn) {
    return (
      <EmptyState
        icon="filter"
        title="No balances match"
        cta={<Button onClick={onClear}>Clear filters</Button>}
      >
        Try another search or remove a filter.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="wallet" title="No store balances yet">
      When an account tops up its store balance, or staff adjust it, it appears here.
    </EmptyState>
  );
}
