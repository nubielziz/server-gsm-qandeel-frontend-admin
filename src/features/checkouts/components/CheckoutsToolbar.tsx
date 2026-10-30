// CheckoutsToolbar: the bar above the table. The "Needs a reminder / All" segments, the email search, the live count, how many rows
// are ticked and the Send reminder button. Ports the `bar` of checkoutsBody in 51-p-checkouts.js, with the search added. The search
// text is sent after a pause; the segments apply at once.
import { Button, Icon, SearchInput, SegmentedControl, useDebouncedCommit } from '@/components/ui';
import { num } from '@/lib/format';
import type { CheckoutGrants } from '../hooks/useCheckoutGrants';
import { FILTER_ITEMS, type CheckoutFilters } from '../lib/filters';

export interface CheckoutsToolbarProps {
  filters: CheckoutFilters;
  onChange: (patch: Partial<CheckoutFilters>) => void;
  /** The number of checkouts that match, from the server. */
  total: number | undefined;
  /** How many rows are ticked, and how many of those the server says can be reminded. */
  picked: number;
  sendable: number;
  grants: CheckoutGrants;
  sending: boolean;
  onSend: () => void;
}

export function CheckoutsToolbar({
  filters,
  onChange,
  total,
  picked,
  sendable,
  grants,
  sending,
  onSend,
}: CheckoutsToolbarProps) {
  const search = useDebouncedCommit(filters.q, (q) => onChange({ q }));
  const lock = grants.needs('growth:send');
  const blocked = picked - sendable;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
      <SegmentedControl
        items={FILTER_ITEMS}
        value={filters.filter}
        onChange={(filter) => onChange({ filter })}
        label="Checkout filter"
      />
      <SearchInput value={search.text} onChange={search.setText} placeholder="Search email" />
      <span className="flex-1" />
      {total !== undefined && (
        <span className="text-xs text-ink3" aria-live="polite">
          {num(total)} {total === 1 ? 'checkout' : 'checkouts'}
        </span>
      )}
      {picked > 0 && (
        <span className="text-xs text-ink2">
          {picked} selected{blocked > 0 ? `, ${blocked} cannot be reminded` : ''}
        </span>
      )}
      <Button
        variant="primary"
        size="sm"
        disabled={sendable === 0 || lock.disabled}
        loading={sending}
        title={
          lock.title ??
          (picked > 0 && sendable === 0 ? 'None of the ticked checkouts can be reminded' : undefined)
        }
        onClick={onSend}
      >
        <Icon name="send" className="ic-sm" />
        Send reminder{sendable > 1 ? 's' : ''}
      </Button>
    </div>
  );
}
