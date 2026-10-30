// LedgerToolbar: the search box, the type filter, the account chip, Clear filters and the live count above the ledger.
// Ports the toolbar row of ledgerTab in 45-p-finance.js. The search text is sent after a pause; the filters apply at once.
import { Button, Icon, SearchInput, SelectField, TableToolbar, useDebouncedCommit } from '@/components/ui';
import { num } from '@/lib/format';
import { accountName } from '../lib/accounts';
import { hasLedgerFilters, type LedgerFilters } from '../lib/ledgerView';
import { LEDGER_KIND_LABEL } from '../lib/kinds';

export interface LedgerToolbarProps {
  filters: LedgerFilters;
  onChange: (patch: Partial<LedgerFilters>) => void;
  onClear: () => void;
  /** The number of entries that match, from the server. */
  total: number | undefined;
}

const KIND_OPTIONS = [
  { value: '', label: 'All types' },
  ...Object.entries(LEDGER_KIND_LABEL).map(([value, label]) => ({ value, label })),
];

export function LedgerToolbar({ filters, onChange, onClear, total }: LedgerToolbarProps) {
  const search = useDebouncedCommit(filters.q, (q) => onChange({ q }));
  return (
    <TableToolbar
      count={total === undefined ? undefined : `${num(total)} ${total === 1 ? 'entry' : 'entries'}`}
    >
      <SearchInput
        value={search.text}
        onChange={search.setText}
        placeholder="Search journal, memo, merchant"
      />
      <SelectField
        aria-label="Filter by type"
        value={filters.kind}
        options={KIND_OPTIONS}
        onChange={(event) => onChange({ kind: event.target.value })}
      />
      {filters.account && (
        <button
          type="button"
          className="chip !h-8 !px-2.5 font-sans !text-sm"
          aria-label={`Remove account filter ${accountName(filters.account)}`}
          onClick={() => onChange({ account: '' })}
        >
          Account: {accountName(filters.account)}
          <Icon name="x" className="ic-xs" />
        </button>
      )}
      {hasLedgerFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </TableToolbar>
  );
}
