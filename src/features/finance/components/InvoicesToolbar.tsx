// InvoicesToolbar: the search box, the status and kind filters, Clear filters and the live count above the invoice list. New in the
// console (MISMATCHES M123). The search text is sent after a pause. Issuing an invoice is the Issue invoice view, not a button here.
import { Button, SearchInput, SelectField, useDebouncedCommit } from '@/components/ui';
import { num } from '@/lib/format';
import {
  hasInvoiceFilters,
  INVOICE_KINDS,
  INVOICE_STATUSES,
  type InvoiceListState,
} from '../lib/invoiceView';
import { INVOICE_STATUS_BADGE, invoiceKindLabel } from '../lib/invoices';

export interface InvoicesToolbarProps {
  filters: InvoiceListState;
  onChange: (patch: Partial<InvoiceListState>) => void;
  onClear: () => void;
  /** The number of invoices that match, from the server. */
  total: number | undefined;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...INVOICE_STATUSES.map((status) => ({ value: status, label: INVOICE_STATUS_BADGE[status].label })),
];
const KIND_OPTIONS = [
  { value: '', label: 'All kinds' },
  ...INVOICE_KINDS.map((kind) => ({ value: kind, label: invoiceKindLabel(kind) })),
];

export function InvoicesToolbar({ filters, onChange, onClear, total }: InvoicesToolbarProps) {
  const search = useDebouncedCommit(filters.q, (q) => onChange({ q }));
  return (
    <div className="flex flex-wrap items-center gap-2 p-3">
      <SearchInput value={search.text} onChange={search.setText} placeholder="Search number or account" />
      <SelectField
        aria-label="Filter by status"
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(event) => onChange({ status: event.target.value as InvoiceListState['status'] })}
      />
      <SelectField
        aria-label="Filter by kind"
        value={filters.kind}
        options={KIND_OPTIONS}
        onChange={(event) => onChange({ kind: event.target.value as InvoiceListState['kind'] })}
      />
      {hasInvoiceFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
      <span className="flex-1" />
      {total !== undefined && (
        <span className="text-xs text-ink3" aria-live="polite">
          {num(total)} {total === 1 ? 'invoice' : 'invoices'}
        </span>
      )}
    </div>
  );
}
