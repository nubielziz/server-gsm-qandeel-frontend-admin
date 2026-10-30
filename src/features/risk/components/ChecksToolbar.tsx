// ChecksToolbar: the search box, the check type and result filters, Clear filters and the live count above the check table.
// Ports the `toolbar` of `tabChecks` in 54-p-risk.js (the result filter is new). The search text is sent after a pause.
import { Button, SearchInput, SelectField, TableToolbar } from '@/components/ui';
import { num } from '@/lib/format';
import { useDebouncedCommit } from '../hooks/useDebouncedCommit';
import { CHECK_KIND_LABEL, CHECK_KINDS, CHECK_RESULT, CHECK_RESULTS } from '../lib/labels';
import { hasChecksFilters, type ChecksView } from '../lib/view';

export interface ChecksToolbarProps {
  view: ChecksView;
  onChange: (patch: Partial<ChecksView>) => void;
  onClear: () => void;
  /** The number of checks that match, from the server. */
  total: number | undefined;
}

export function ChecksToolbar({ view, onChange, onClear, total }: ChecksToolbarProps) {
  const search = useDebouncedCommit(view.q, (q) => onChange({ q }));
  return (
    <TableToolbar
      count={total === undefined ? undefined : `${num(total)} ${total === 1 ? 'check' : 'checks'}`}
    >
      <SearchInput value={search.text} onChange={search.setText} placeholder="Search IMEI or model" />
      <SelectField
        aria-label="Filter by check type"
        value={view.kind}
        options={[
          { value: '', label: 'All checks' },
          ...CHECK_KINDS.map((kind) => ({ value: kind, label: CHECK_KIND_LABEL[kind] })),
        ]}
        onChange={(event) => onChange({ kind: event.target.value as ChecksView['kind'] })}
      />
      <SelectField
        aria-label="Filter by result"
        value={view.result}
        options={[
          { value: '', label: 'All results' },
          ...CHECK_RESULTS.map((result) => ({ value: result, label: CHECK_RESULT[result].label })),
        ]}
        onChange={(event) => onChange({ result: event.target.value as ChecksView['result'] })}
      />
      {hasChecksFilters(view) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </TableToolbar>
  );
}
