// AccrualsToolbar: the status buttons, the agent filter, "Select all N" and the 7-day hint above the accruals table. Ports the first
// row of accrualsTab in 46-p-commissions.js.
import { Button, SelectField, type SelectOption } from '@/components/ui';
import { num } from '@/lib/format';
import type { AccrualCounts } from '../hooks/useAccrualCounts';
import type { AccrualView } from '../lib/filters';
import { AccrualStatusSeg } from './AccrualStatusSeg';

export interface AccrualsToolbarProps {
  view: AccrualView;
  counts: AccrualCounts;
  agents: readonly SelectOption[];
  onChange: (patch: Partial<AccrualView>) => void;
  /** How many accruals match the filter, from the server; "Select all" appears when there are some and the status is Ready. */
  total: number | undefined;
  selectAll: { disabled: boolean; title?: string; busy: boolean; onSelect: () => void };
}

/** The filters row. */
export function AccrualsToolbar({ view, counts, agents, onChange, total, selectAll }: AccrualsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3">
      <AccrualStatusSeg value={view.status} counts={counts} onChange={(status) => onChange({ status })} />
      <SelectField
        aria-label="Filter by agent"
        value={view.agent ?? ''}
        options={agents}
        onChange={(event) => onChange({ agent: event.target.value ? Number(event.target.value) : null })}
      />
      {view.status === 'accrued' && total !== undefined && total > 0 && (
        <Button
          variant="ghost"
          size="sm"
          disabled={selectAll.disabled}
          loading={selectAll.busy}
          title={selectAll.title}
          onClick={selectAll.onSelect}
        >
          Select all {num(total)}
        </Button>
      )}
      <span className="flex-1" />
      <span className="hidden text-xs text-ink3 md:inline">
        Normally approved after 7 days to cover refunds. You can approve earlier.
      </span>
    </div>
  );
}
