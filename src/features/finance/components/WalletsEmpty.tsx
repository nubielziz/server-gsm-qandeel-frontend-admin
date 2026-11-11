// WalletsEmpty: what the customer wallets table says when there are no rows: nothing matches the filters, or no customer has a balance yet.
import { Button, EmptyState } from '@/components/ui';

export function WalletsEmpty({ filtersOn, onClear }: { filtersOn: boolean; onClear: () => void }) {
  if (filtersOn) {
    return (
      <EmptyState
        icon="filter"
        title="No wallets match"
        cta={<Button onClick={onClear}>Clear filters</Button>}
      >
        Try another search or remove a filter.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="wallet" title="No customer balances yet">
      When a customer tops up their store balance, or staff adjust it, it appears here.
    </EmptyState>
  );
}
