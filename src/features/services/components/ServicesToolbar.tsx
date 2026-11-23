// ServicesToolbar: the Catalog table's search box, type, category and supplier menus, the filters an address brought (Below floor, On
// the shop) as removable chips, Clear filters and the live count. Ports the toolbar of servicesTab in 43-p-services.js. The search text
// is sent after a pause; the rest applies at once. Every filter that is on can be seen and removed here.
import { Button, SearchInput, SelectField, TableToolbar, type SelectOption } from '@/components/ui';
import { num } from '@/lib/format';
import { useDebouncedCommit } from '../hooks/useDebouncedCommit';
import { hasActiveFilters, type ServiceFilters } from '../lib/filters';
import { TYPE_FILTER_OPTIONS } from '../lib/status';
import type { NamedRef } from '../types';
import { FilterChip } from './FilterChip';

export interface ServicesToolbarProps {
  filters: ServiceFilters;
  onChange: (patch: Partial<ServiceFilters>) => void;
  onClear: () => void;
  /** The number of services that match, from the server. */
  total: number | undefined;
  categories: readonly NamedRef[];
  /** The suppliers to filter by; the menu is locked with the reason when the role may not read suppliers. */
  suppliers: readonly NamedRef[];
  supplierLock: { disabled: boolean; title?: string };
}

/**
 * A menu's options: "All …" first, then the names. An id from the address that is not in the list (a supplier the role may not read,
 * a list still loading) still shows, by number, so the filter is never on out of sight.
 */
function menuOptions(all: string, noun: string, names: readonly NamedRef[], value: string): SelectOption[] {
  const options: SelectOption[] = [
    { value: '', label: all },
    ...names.map((n) => ({ value: String(n.id), label: n.name })),
  ];
  if (value && !names.some((n) => String(n.id) === value))
    options.push({ value, label: `${noun} #${value}` });
  return options;
}

/** Filters above the table; the search text is committed after a pause. */
export function ServicesToolbar({
  filters,
  onChange,
  onClear,
  total,
  categories,
  suppliers,
  supplierLock,
}: ServicesToolbarProps) {
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
      <SelectField
        aria-label="Filter by category"
        value={filters.categoryId}
        options={menuOptions('All categories', 'Category', categories, filters.categoryId)}
        onChange={(event) => onChange({ categoryId: event.target.value })}
      />
      <SelectField
        aria-label="Filter by supplier"
        value={filters.supplierId}
        options={menuOptions('All suppliers', 'Supplier', suppliers, filters.supplierId)}
        disabled={supplierLock.disabled}
        title={supplierLock.title}
        onChange={(event) => onChange({ supplierId: event.target.value })}
      />
      {filters.belowFloor && (
        <FilterChip label="Below floor" icon="alert" onRemove={() => onChange({ belowFloor: false })} />
      )}
      {filters.shop && (
        <FilterChip label="On the shop" icon="store" onRemove={() => onChange({ shop: false })} />
      )}
      {hasActiveFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </TableToolbar>
  );
}
