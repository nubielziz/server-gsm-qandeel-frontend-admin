// OrdersToolbar: the search box, the filters, the Past SLA chip, Clear filters and the live count above the table. Ports the
// `toolbar` of pageOrders in 41-p-orders.js. The search text is sent after a pause; every other filter applies at once.
// A menu whose names cannot be read (no permission, still loading) is left out, so no one picks from a list that is empty.
import { SearchInput, SelectField, TableToolbar, Button, type SelectOption } from '@/components/ui';
import { num } from '@/lib/format';
import { useDebouncedCommit } from '../hooks/useDebouncedCommit';
import { hasActiveFilters, type OrderFilters } from '../lib/filters';
import { CHANNEL_OPTIONS, SERVICE_TYPES, TYPE_LABEL } from '../lib/status';
import type { ClientOption, SupplierOption } from '../types';
import { PastSlaChip } from './PastSlaChip';

export interface OrdersToolbarProps {
  filters: OrderFilters;
  onChange: (patch: Partial<OrderFilters>) => void;
  onClear: () => void;
  /** The number of orders that match, from the server. */
  total: number | undefined;
  /** The names for the supplier and merchant menus; `undefined` leaves the menu out. */
  suppliers?: readonly SupplierOption[];
  clients?: readonly ClientOption[];
}

// A select shows its first option when the value is not among them; keep the chosen id visible while the names load.
function withChosen(options: readonly SelectOption[], chosen: string, label: string): SelectOption[] {
  if (!chosen || options.some((option) => String(option.value) === chosen)) return [...options];
  return [...options, { value: chosen, label: `${label} ${chosen}` }];
}

export function OrdersToolbar({ filters, onChange, onClear, total, suppliers, clients }: OrdersToolbarProps) {
  const search = useDebouncedCommit(filters.q, (q) => onChange({ q }));
  const supplierOptions = withChosen(
    [
      { value: '', label: 'All suppliers' },
      ...(suppliers ?? []).map((s) => ({ value: s.id, label: s.name })),
    ],
    filters.supplierId,
    'Supplier',
  );
  const clientOptions = withChosen(
    [{ value: '', label: 'All merchants' }, ...(clients ?? []).map((c) => ({ value: c.id, label: c.name }))],
    filters.clientId,
    'Merchant',
  );

  return (
    <TableToolbar
      count={total === undefined ? undefined : `${num(total)} ${total === 1 ? 'order' : 'orders'}`}
    >
      <SearchInput
        value={search.text}
        onChange={search.setText}
        placeholder="Search ID, IMEI, buyer, reference"
      />
      <SelectField
        aria-label="Filter by type"
        value={filters.type}
        options={[
          { value: '', label: 'All types' },
          ...SERVICE_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] })),
        ]}
        onChange={(event) => onChange({ type: event.target.value as OrderFilters['type'] })}
      />
      {suppliers && (
        <SelectField
          aria-label="Filter by supplier"
          value={filters.supplierId}
          options={supplierOptions}
          onChange={(event) => onChange({ supplierId: event.target.value })}
        />
      )}
      <SelectField
        aria-label="Filter by channel"
        value={filters.channel}
        options={CHANNEL_OPTIONS}
        onChange={(event) => onChange({ channel: event.target.value as OrderFilters['channel'] })}
      />
      {clients && (
        <SelectField
          aria-label="Filter by merchant"
          value={filters.clientId}
          options={clientOptions}
          selectWrapClassName="hidden md:inline-flex"
          onChange={(event) => onChange({ clientId: event.target.value })}
        />
      )}
      <PastSlaChip active={filters.pastSla} onToggle={() => onChange({ pastSla: !filters.pastSla })} />
      {hasActiveFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </TableToolbar>
  );
}
