// BlocklistTable: the blocklist table with the demo's columns (type, blocked value and reason, how, by, added, Remove). Ports the
// `cols` of `tabBlock` in 54-p-risk.js. The page owns the data, the sort and the page; Remove needs `risk:delete`.
import type { ReactNode } from 'react';
import {
  Button,
  DataTable,
  TypeTag,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { ago, fmtDate } from '@/lib/format';
import type { RiskGrants } from '../hooks/useRiskGrants';
import { BLOCK_KIND_LABEL, BLOCK_SOURCE_LABEL, labelOf } from '../lib/labels';
import { RISK_PERMISSION } from '../lib/permissions';
import type { BlocklistEntry } from '../types';

export interface BlocklistTableProps {
  rows: readonly BlocklistEntry[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  now: number;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  grants: RiskGrants;
  onRemove: (entry: BlocklistEntry) => void;
  empty: ReactNode;
}

export function BlocklistTable({
  rows,
  state,
  error,
  onRetry,
  now,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  grants,
  onRemove,
  empty,
}: BlocklistTableProps) {
  const lock = grants.needs(RISK_PERMISSION.removeBlock);
  const columns: DataTableColumn<BlocklistEntry>[] = [
    {
      key: 'kind',
      label: 'Type',
      sortField: 'kind',
      render: (entry) => <TypeTag>{labelOf(BLOCK_KIND_LABEL, entry.kind)}</TypeTag>,
    },
    {
      key: 'display',
      label: 'Blocked',
      sortField: 'display',
      render: (entry) => (
        <>
          <span className="mono">{entry.display}</span>
          <p className="text-2xs text-ink3">
            {entry.reason}
            {entry.expiresAt && ` · until ${fmtDate(entry.expiresAt)}`}
          </p>
        </>
      ),
    },
    {
      key: 'source',
      label: 'How',
      hide: 'md',
      render: (entry) => <span className="text-ink2">{labelOf(BLOCK_SOURCE_LABEL, entry.source)}</span>,
    },
    {
      key: 'by',
      label: 'By',
      hide: 'lg',
      render: (entry) => <span className="text-ink2">{entry.createdBy?.name ?? 'System'}</span>,
    },
    {
      key: 'added',
      label: 'Added',
      hide: 'sm',
      sortField: 'createdAt',
      render: (entry) => <span className="text-ink2">{ago(entry.createdAt, now)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (entry) => (
        <Button size="sm" {...lock} aria-label={`Remove ${entry.display}`} onClick={() => onRemove(entry)}>
          Remove
        </Button>
      ),
    },
  ];
  return (
    <DataTable
      caption="Blocklist"
      columns={columns}
      rows={rows}
      rowKey={(entry) => entry.id}
      state={state}
      error={error}
      errorTitle="Could not load the blocklist"
      onRetry={onRetry}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      empty={empty}
    />
  );
}
