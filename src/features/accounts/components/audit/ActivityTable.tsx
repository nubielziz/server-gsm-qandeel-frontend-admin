// ActivityTable: the entries about one account in the list skin: when, what, who and from which address. The footer pager is the part's.
import type { ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/ui';
import type { AuditLog } from '@/features/audit';
import { fmtDate } from '@/lib/format';
import { whatText, whoText } from './activityText';

const COLUMNS: DataTableColumn<AuditLog>[] = [
  {
    key: 'when',
    label: 'When',
    className: 'whitespace-nowrap',
    render: (row) => (
      <time dateTime={row.createdAt} className="tabular-nums text-ink2">
        {fmtDate(row.createdAt)}
      </time>
    ),
  },
  { key: 'what', label: 'What', render: (row) => whatText(row) },
  {
    key: 'who',
    label: 'Who',
    hide: 'sm',
    render: (row) => <span className="font-medium">{whoText(row)}</span>,
  },
  {
    key: 'from',
    label: 'From',
    hide: 'md',
    render: (row) =>
      row.ip ? (
        <span className="mono text-xs text-ink2">{row.ip}</span>
      ) : (
        <span className="text-ink3">–</span>
      ),
  },
];

export interface ActivityTableProps {
  rows: readonly AuditLog[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  empty: ReactNode;
}

/** One page of the account's entries, newest first (the server's order). */
export function ActivityTable({ rows, state, error, onRetry, empty }: ActivityTableProps) {
  return (
    <DataTable
      skin="list"
      footer={false}
      caption="Activity log"
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => row.id}
      state={state}
      error={error}
      errorTitle="Could not load the activity log"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
