// CheckoutsEmpty: what the table says when there are no rows: nothing matches the search, everyone has been reminded, or there are
// no abandoned checkouts at all. Ports the `empty` block of checkoutsBody in 51-p-checkouts.js, with the search case added.
import { Button, EmptyState } from '@/components/ui';
import type { CheckoutFilter } from '../lib/filters';

export interface CheckoutsEmptyProps {
  filter: CheckoutFilter;
  searching: boolean;
  onShowAll: () => void;
  onClearSearch: () => void;
}

export function CheckoutsEmpty({ filter, searching, onShowAll, onClearSearch }: CheckoutsEmptyProps) {
  if (searching) {
    return (
      <EmptyState
        icon="search"
        title="No checkouts match this search"
        cta={<Button onClick={onClearSearch}>Clear search</Button>}
      >
        Try a different email.
      </EmptyState>
    );
  }
  if (filter === 'remind') {
    return (
      <EmptyState
        icon="checkCircle"
        title="Everyone has been reminded"
        cta={<Button onClick={onShowAll}>Show all checkouts</Button>}
      >
        Nobody is waiting for a reminder.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="inbox" title="No abandoned checkouts">
      People who leave an email at checkout and do not pay appear here.
    </EmptyState>
  );
}
