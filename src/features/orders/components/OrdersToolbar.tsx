// OrdersToolbar: the search box, the filters, the Past SLA chip, Clear filters and the live count above the table. Ports the
// `toolbar` of pageOrders in 41-p-orders.js. The search text is sent after a pause; every other filter applies at once.
// A menu whose names cannot be read (no permission, still loading) is left out, so no one picks from a list that is empty.
import { SearchInput, SelectField, TableToolbar, Button, type SelectOption } from '@/components/ui';
import { num } from '@/lib/format';
import { useDebouncedCommit } from '../hooks/useDebouncedCommit';
import { hasActiveFilters, type OrderFilters } from '../lib/filters';
import { CHANNEL_OPTIONS, SERVICE_TYPES, TYPE_LABEL } from '../lib/status';
import type { AccountOption, RankOption, SupplierOption } from '../types';
import { PastSlaChip } from './PastSlaChip';

export interface OrdersToolbarProps {
  filters: OrderFilters;
  onChange: (patch: Partial<OrderFilters>) => void;
  onClear: () => void;
  /** The number of orders that match, from the server. */
  total: number | undefined;
  /** The names for the supplier, merchant and rank menus; `undefined` leaves the menu out. */
  suppliers?: readonly SupplierOption[];
  merchants?: readonly AccountOption[];
  ranks?: readonly RankOption[];
}

// A select shows its first option when the value is not among them; keep the chosen id visible while the names load.
function withChosen(options: readonly SelectOption[], chosen: string, label: string): SelectOption[] {
  if (!chosen || options.some((option) => String(option.value) === chosen)) return [...options];
  return [...options, { value: chosen, label: `${label} ${chosen}` }];
}

export function OrdersToolbar({
  filters,
  onChange,
  onClear,
  total,
  suppliers,
  merchants,
  ranks,
}: OrdersToolbarProps) {
  const search = useDebouncedCommit(filters.q, (q) => onChange({ q }));
  const supplierOptions = withChosen(
    [
      { value: '', label: 'All suppliers' },
      ...(suppliers ?? []).map((s) => ({ value: s.id, label: s.name })),
    ],
    filters.supplierId,
    'Supplier',
  );
  // The menu lists merchants only; an account that is not one (an address from a retail account's page) stays shown as chosen.
  const merchantOptions = withChosen(
    [
      { value: '', label: 'All merchants' },
      ...(merchants ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    filters.accountId,
    'Account',
  );
  const rankOptions = withChosen(
    [{ value: '', label: 'All ranks' }, ...(ranks ?? []).map((r) => ({ value: r.id, label: r.name }))],
    filters.rankId,
    'Rank',
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
      {merchants && (
        <SelectField
          aria-label="Filter by merchant"
          value={filters.accountId}
          options={merchantOptions}
          selectWrapClassName="hidden md:inline-flex"
          onChange={(event) => onChange({ accountId: event.target.value })}
        />
      )}
      {ranks && (
        <SelectField
          aria-label="Filter by rank"
          value={filters.rankId}
          options={rankOptions}
          selectWrapClassName="hidden md:inline-flex"
          onChange={(event) => onChange({ rankId: event.target.value })}
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
