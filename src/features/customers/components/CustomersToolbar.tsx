// CustomersToolbar: the search box, the country filter, Clear filters and the live count above the table. Ports the `toolbar` of
// pageCustomers in 48-p-customers.js. The search text is sent after a pause; the country applies at once.
import { Button, SearchInput, SelectField, TableToolbar, useDebouncedCommit } from '@/components/ui';
import { num } from '@/lib/format';
import { countryOptions } from '../lib/countries';
import { hasActiveFilters, type CustomerFilters } from '../lib/filters';

export interface CustomersToolbarProps {
  filters: CustomerFilters;
  onChange: (patch: Partial<CustomerFilters>) => void;
  onClear: () => void;
  /** The number of customers that match, from the server. */
  total: number | undefined;
}

export function CustomersToolbar({ filters, onChange, onClear, total }: CustomersToolbarProps) {
  const search = useDebouncedCommit(filters.q, (q) => onChange({ q }));
  // A country in the address that the list does not know stays selectable, so the filter never looks off.
  const options = countryOptions(filters.country);
  return (
    <TableToolbar
      count={total === undefined ? undefined : `${num(total)} ${total === 1 ? 'customer' : 'customers'}`}
    >
      <SearchInput value={search.text} onChange={search.setText} placeholder="Search name, email" />
      <SelectField
        aria-label="Filter by country"
        value={filters.country}
        options={[{ value: '', label: 'All countries' }, ...options]}
        onChange={(event) => onChange({ country: event.target.value })}
      />
      {hasActiveFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </TableToolbar>
  );
}
