// ServicesToolbar: the search box, the type filter, the "Below floor" and "Disabled" chips, Clear filters and the live count above
// the table. Ports the toolbar of servicesTab in 43-p-services.js. The search text is sent after a pause; the rest applies at once.
import { Button, SearchInput, SelectField, TableToolbar } from '@/components/ui';
import { num } from '@/lib/format';
import { useDebouncedCommit } from '../hooks/useDebouncedCommit';
import { hasActiveFilters, type ServiceFilters } from '../lib/filters';
import { TYPE_FILTER_OPTIONS } from '../lib/status';
import { FilterChip } from './FilterChip';

export interface ServicesToolbarProps {
  filters: ServiceFilters;
  onChange: (patch: Partial<ServiceFilters>) => void;
  onClear: () => void;
  /** The number of services that match, from the server. */
  total: number | undefined;
}

/** Filters above the table; the search text is committed after a pause. */
export function ServicesToolbar({ filters, onChange, onClear, total }: ServicesToolbarProps) {
  const search = useDebouncedCommit(filters.q, (q) => onChange({ q }));
  return (
    <TableToolbar
      count={total === undefined ? undefined : `${num(total)} ${total === 1 ? 'service' : 'services'}`}
    >
      <SearchInput
        value={search.text}
        onChange={search.setText}
        placeholder="Search service, code, category"
      />
      <SelectField
        aria-label="Filter by type"
        value={filters.type}
        options={TYPE_FILTER_OPTIONS}
        onChange={(event) => onChange({ type: event.target.value as ServiceFilters['type'] })}
      />
      <FilterChip
        active={filters.belowFloor}
        icon="alert"
        onToggle={() => onChange({ belowFloor: !filters.belowFloor })}
      >
        Below floor
      </FilterChip>
      <FilterChip
        active={filters.status === 'disabled'}
        icon="ban"
        onToggle={() => onChange({ status: filters.status === 'disabled' ? '' : 'disabled' })}
      >
        Disabled
      </FilterChip>
      {hasActiveFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </TableToolbar>
  );
}
