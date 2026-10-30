// ChecksTable: the IMEI check table with the demo's columns (IMEI, device, check, result, from, country, order, when). Ports
// the `cols` of `tabChecks` in 54-p-risk.js. The IMEI is shown as the server sends it (digits, or a hash after the retention
// period) and opens the check's details. The page owns the data, the sort and the page.
import type { ReactNode } from 'react';
import {
  DataTable,
  EmptyState,
  TypeTag,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { ago, fmtImei } from '@/lib/format';
import { CHECK_KIND_LABEL, CHECK_SOURCE_LABEL, labelOf } from '../lib/labels';
import type { ImeiCheck } from '../types';
import { CheckResultBadge } from './CheckResultBadge';
import { OrderLink } from './OrderLink';

export interface ChecksTableProps {
  rows: readonly ImeiCheck[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  /** From `useNow`, so the ages move together and a test can fix them. */
  now: number;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onOpen: (check: ImeiCheck) => void;
  /** True when a search or a filter is on, which changes what the empty state says. */
  filtered: boolean;
}

export function ChecksTable({
  rows,
  state,
  error,
  onRetry,
  now,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onOpen,
  filtered,
}: ChecksTableProps) {
  const columns: DataTableColumn<ImeiCheck>[] = [
    {
      key: 'imei',
      label: 'IMEI',
      render: (check) => (
        <button type="button" className="link mono" onClick={() => onOpen(check)}>
          {fmtImei(check.imei)}
        </button>
      ),
    },
    {
      key: 'device',
      label: 'Device',
      hide: 'sm',
      sortField: 'model',
      render: (check) => (
        <span className="text-ink2">
          {check.brand} {check.model}
        </span>
      ),
    },
    {
      key: 'kind',
      label: 'Check',
      hide: 'md',
      sortField: 'checkType',
      render: (check) => <TypeTag>{labelOf(CHECK_KIND_LABEL, check.checkType)}</TypeTag>,
    },
    {
      key: 'status',
      label: 'Result',
      sortField: 'status',
      render: (check) => <CheckResultBadge status={check.status} />,
    },
    {
      key: 'source',
      label: 'From',
      hide: 'lg',
      render: (check) => <span className="text-ink2">{labelOf(CHECK_SOURCE_LABEL, check.source)}</span>,
    },
    {
      key: 'country',
      label: 'Country',
      hide: 'xl',
      render: (check) => <span className="text-ink2">{check.country ?? '–'}</span>,
    },
    {
      key: 'order',
      label: 'Order',
      hide: 'md',
      render: (check) =>
        check.orderId === null ? <span className="text-ink3">–</span> : <OrderLink id={check.orderId} />,
    },
    {
      key: 'when',
      label: 'When',
      sortField: 'createdAt',
      render: (check) => <span className="text-ink2">{ago(check.createdAt, now)}</span>,
    },
  ];

  const empty: ReactNode = (
    <EmptyState icon="search" title="No checks found">
      {filtered ? 'Try another search or check type.' : 'Checks from the public IMEI checker appear here.'}
    </EmptyState>
  );

  return (
    <DataTable
      caption="IMEI checks"
      columns={columns}
      rows={rows}
      rowKey={(check) => check.id}
      state={state}
      error={error}
      errorTitle="Could not load the IMEI checks"
      onRetry={onRetry}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      onRowClick={onOpen}
      empty={empty}
    />
  );
}
