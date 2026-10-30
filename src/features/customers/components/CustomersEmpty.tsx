// CustomersEmpty: what the table says when there are no rows: no customers yet, or nothing matches the tab and filters. Ports
// the `empty` pair of pageCustomers in 48-p-customers.js; Clear filters only shows when a filter is on, so it is never a dead button.
import { Button, EmptyState, Icon } from '@/components/ui';

export interface CustomersEmptyProps {
  /** No customer exists at all (the All count is zero). */
  noCustomers: boolean;
  filtersOn: boolean;
  onClear: () => void;
  /** Undefined hides the Add button (no permission). */
  onAdd?: () => void;
}

export function CustomersEmpty({ noCustomers, filtersOn, onClear, onAdd }: CustomersEmptyProps) {
  if (noCustomers) {
    return (
      <EmptyState
        icon="user"
        title="No customers yet"
        cta={
          onAdd && (
            <Button variant="primary" onClick={onAdd}>
              <Icon name="plus" className="ic-sm" />
              Add a customer
            </Button>
          )
        }
      >
        People who buy on the storefront appear here, as a guest by email or with an account. Merchants are on
        the Merchants page.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon="filter"
      title="No customers match"
      cta={filtersOn ? <Button onClick={onClear}>Clear filters</Button> : undefined}
    >
      Try another search or tab.
    </EmptyState>
  );
}
