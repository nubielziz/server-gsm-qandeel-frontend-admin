// InvoicesEmpty: what the invoice table says when there are no rows: nothing matches the filters, or none was ever issued.
import { Button, EmptyState } from '@/components/ui';

export function InvoicesEmpty({ filtersOn, onClear }: { filtersOn: boolean; onClear: () => void }) {
  if (filtersOn) {
    return (
      <EmptyState
        icon="filter"
        title="No invoices match"
        cta={<Button onClick={onClear}>Clear filters</Button>}
      >
        Try another search or remove a filter.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="file" title="No invoices yet">
      Top-up invoices, tax receipts and the manual invoices you issue appear here.
    </EmptyState>
  );
}
