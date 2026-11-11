// CampaignsToolbar: the bar above the campaign table: name search, status and purpose filters, the live count and "Clear filters". The search text is
// sent to the server after a pause; the selects apply at once.
import { Button, SearchInput, SelectField, TableToolbar, useDebouncedCommit } from '@/components/ui';
import { num } from '@/lib/format';
import { hasFilters, type CampaignFilters } from '../lib/filters';
import { PURPOSE_OPTIONS, STATUS_OPTIONS } from '../lib/status';
import type { CampaignPurpose, CampaignStatus } from '../types';

export interface CampaignsToolbarProps {
  filters: CampaignFilters;
  onChange: (patch: Partial<CampaignFilters>) => void;
  onClear: () => void;
  /** The number of campaigns that match, from the server. */
  total: number | undefined;
}

export function CampaignsToolbar({ filters, onChange, onClear, total }: CampaignsToolbarProps) {
  const search = useDebouncedCommit(filters.q, (q) => onChange({ q }));
  return (
    <TableToolbar
      count={total === undefined ? undefined : `${num(total)} ${total === 1 ? 'campaign' : 'campaigns'}`}
    >
      <SearchInput value={search.text} onChange={search.setText} placeholder="Search by name" />
      <SelectField
        aria-label="Filter by status"
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(event) => onChange({ status: event.target.value as '' | CampaignStatus })}
      />
      <SelectField
        aria-label="Filter by purpose"
        value={filters.purpose}
        options={PURPOSE_OPTIONS}
        onChange={(event) => onChange({ purpose: event.target.value as '' | CampaignPurpose })}
      />
      {hasFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </TableToolbar>
  );
}
