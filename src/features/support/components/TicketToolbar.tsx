// TicketToolbar: the search box, the Open / Overdue / Mine / Resolved / All filter, the Who wrote control and the removable
// "Customer: <name>" chip above the inbox list. Ports the search and the two segmented controls of pageSupport (49-p-support.js).
// The search text is sent after a pause; every other filter applies at once.
import { Icon, SearchInput, SegmentedControl, useDebouncedCommit } from '@/components/ui';
import { FILTER_ITEMS, WHO_ITEMS, type SupportFilters } from '../lib/filters';

export interface TicketToolbarProps {
  filters: SupportFilters;
  onChange: (patch: Partial<SupportFilters>) => void;
  /** The name of the customer in the address, once a ticket has told it; before that the chip shows the id. */
  customerName?: string;
}

export function TicketToolbar({ filters, onChange, customerName }: TicketToolbarProps) {
  const search = useDebouncedCommit(filters.q, (q) => onChange({ q }));
  return (
    <div className="space-y-2 border-b border-line p-3">
      <SearchInput
        value={search.text}
        onChange={search.setText}
        placeholder="Search ticket, customer, subject"
      />
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          items={FILTER_ITEMS}
          value={filters.filter}
          onChange={(filter) => onChange({ filter })}
          label="Ticket filter"
        />
        {filters.customerId === null ? (
          <SegmentedControl
            items={WHO_ITEMS}
            value={filters.who}
            onChange={(who) => onChange({ who })}
            label="Who wrote"
          />
        ) : (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-sunken ps-2.5 pe-1 text-sm">
            <Icon name="user" className="ic-sm text-ink3" />
            Customer: {customerName ?? `#${filters.customerId}`}
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              aria-label="Remove the customer filter"
              // The list keeps showing what it showed (usually All), now for everyone.
              onClick={() => onChange({ customerId: null, filter: filters.filter })}
            >
              <Icon name="x" className="ic-sm" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
