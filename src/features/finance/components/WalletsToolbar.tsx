// WalletsToolbar: the search box, the state filter, Clear filters and the live count above the store balances list.
// The search text is sent after a pause.
import { Button, SearchInput, SelectField, useDebouncedCommit } from '@/components/ui';
import { num } from '@/lib/format';
import { hasWalletFilters, WALLET_STATES, type WalletListState } from '../lib/walletView';

export interface WalletsToolbarProps {
  filters: WalletListState;
  onChange: (patch: Partial<WalletListState>) => void;
  onClear: () => void;
  /** The number of wallets that match, from the server. */
  total: number | undefined;
}

const STATE_OPTIONS = [
  { value: '', label: 'All states' },
  ...WALLET_STATES.map((state) => ({ value: state.id, label: state.label })),
];

export function WalletsToolbar({ filters, onChange, onClear, total }: WalletsToolbarProps) {
  const search = useDebouncedCommit(filters.q, (q) => onChange({ q }));
  return (
    <div className="flex flex-wrap items-center gap-2 p-3">
      <SearchInput value={search.text} onChange={search.setText} placeholder="Search account name or email" />
      <SelectField
        aria-label="Filter by state"
        value={filters.state}
        options={STATE_OPTIONS}
        onChange={(event) => onChange({ state: event.target.value as WalletListState['state'] })}
      />
      {hasWalletFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
      <span className="flex-1" />
      {total !== undefined && (
        <span className="text-xs text-ink3" aria-live="polite">
          {num(total)} {total === 1 ? 'balance' : 'balances'}
        </span>
      )}
    </div>
  );
}
