// ChecksTable: the four ledger checks as a table (cards on a phone) with the quiet "passed" line under it. Part of the
// Integrity tab (route group health, GET /admin/system/integrity). No demo screen.
import type { DataTableColumn } from '@/components/ui';
import { num } from '@/lib/format';
import { MetaBadge, ResponsiveTable } from '../../components';
import { integrityMeta } from '../../lib';
import type { IntegrityCheck } from '../../types';
import { formatDifference } from './format';
import { PassingLine } from './PassingLine';
import { splitChecks, wasChecked } from './report';

/** Nothing was checked, so the figure is "No data" and not a zero that would read as healthy. */
const NoData = () => <span className="text-ink3">No data</span>;

/**
 * The server's sentence in sans with the check's key in mono below it, then the result, the count and the difference.
 * From `xl` up the name column is two fifths wide, so the result sits near the name and not at the far end of a wide card;
 * below `xl` the table sizes itself, which keeps the names on one line.
 */
const COLUMNS: readonly DataTableColumn<IntegrityCheck>[] = [
  {
    key: 'check',
    label: 'Check',
    className: 'xl:w-2/5',
    render: (check) => (
      <div className="min-w-0 py-1">
        <div className="font-medium">{check.label}</div>
        <div className="mono text-xs text-ink3">{check.key}</div>
      </div>
    ),
  },
  { key: 'result', label: 'Result', render: (check) => <MetaBadge meta={integrityMeta(check.status)} /> },
  {
    key: 'count',
    label: 'Findings',
    num: true,
    render: (check) => (wasChecked(check) ? num(check.count) : <NoData />),
  },
  {
    key: 'difference',
    label: 'Difference',
    num: true,
    render: (check) => (wasChecked(check) ? formatDifference(check.difference) : <NoData />),
  },
];

export interface ChecksTableProps {
  checks: readonly IntegrityCheck[];
  /** The passed checks are listed too (the staff member pressed Show). */
  showPassing: boolean;
  onTogglePassing: () => void;
}

/**
 * Problems first: failed checks, then unknown ones. The passed checks collapse into one quiet line until Show is
 * pressed. A check that gave no result (unknown, or a result the console does not know) shows "No data" in place of
 * its figures.
 */
export function ChecksTable({ checks, showPassing, onTogglePassing }: ChecksTableProps) {
  const { problems, passing } = splitChecks(checks);
  const rows = showPassing ? [...problems, ...passing] : problems;
  return (
    <div>
      {rows.length > 0 && (
        <ResponsiveTable
          footer={false}
          columns={COLUMNS}
          rows={rows}
          rowKey={(check) => check.key}
          caption="Ledger checks"
        />
      )}
      {passing.length > 0 && (
        <PassingLine
          passed={passing.length}
          all={problems.length === 0}
          open={showPassing}
          onToggle={onTogglePassing}
        />
      )}
    </div>
  );
}
