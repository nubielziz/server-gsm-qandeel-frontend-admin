// MerchantsToolbar: the search box, the group filter, Clear filters and the live count above the table. Ports the `toolbar` of
// pageMerchants in 42-p-merchants.js. The search text is sent after a pause; the group applies at once. The group menu is left
// out when the groups cannot be read (no permission, still loading), so no one picks from a list that is empty.
import {
  Button,
  SearchInput,
  SelectField,
  TableToolbar,
  type SelectOption,
  useDebouncedCommit,
} from '@/components/ui';
import { num } from '@/lib/format';
import { hasActiveFilters, type MerchantFilters } from '../lib/filters';
import { merchantGroups } from '../lib/groups';
import type { ClientGroup } from '../types';

export interface MerchantsToolbarProps {
  filters: MerchantFilters;
  onChange: (patch: Partial<MerchantFilters>) => void;
  onClear: () => void;
  /** The number of merchants that match, from the server. */
  total: number | undefined;
  /** The names for the group menu; `undefined` leaves the menu out. */
  groups?: readonly ClientGroup[];
}

// A select shows its first option when the value is not among them; keep the chosen id visible while the names load.
function withChosen(options: readonly SelectOption[], chosen: string): SelectOption[] {
  if (!chosen || options.some((option) => String(option.value) === chosen)) return [...options];
  return [...options, { value: chosen, label: `Group ${chosen}` }];
}

/** The search box, the group filter, Clear filters and the count above the table. */
export function MerchantsToolbar({ filters, onChange, onClear, total, groups }: MerchantsToolbarProps) {
  const search = useDebouncedCommit(filters.q, (q) => onChange({ q }));
  const options = withChosen(
    [
      { value: '', label: 'All groups' },
      ...merchantGroups(groups ?? []).map((g) => ({ value: g.id, label: g.name })),
    ],
    filters.group,
  );

  return (
    <TableToolbar
      count={total === undefined ? undefined : `${num(total)} ${total === 1 ? 'merchant' : 'merchants'}`}
    >
      <SearchInput value={search.text} onChange={search.setText} placeholder="Search name, company, email" />
      {groups && (
        <SelectField
          aria-label="Filter by group"
          value={filters.group}
          options={options}
          onChange={(event) => onChange({ group: event.target.value })}
        />
      )}
      {hasActiveFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </TableToolbar>
  );
}
