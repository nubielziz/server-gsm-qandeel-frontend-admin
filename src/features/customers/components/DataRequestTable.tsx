// DataRequestTable: the data requests table (request, customer, kind, received, due, status, actions). New in the console: the
// demo only listed a customer's requests as text. A pending request has Mark in progress, Done and Reject… buttons; the due
// date turns red when it is close or past, because the deadline is a legal one. It draws what it is given; the page owns the data.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { ago, fmtDay } from '@/lib/format';
import { customerPath } from '../lib/detailTabs';
import {
  dueOf,
  dueText,
  isPending,
  requestKindLabel,
  requestNumber,
  requestStatusBadge,
} from '../lib/requests';
import type { DataRequest, DataRequestStatus } from '../types';

export interface DataRequestTableProps {
  rows: readonly DataRequest[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  now: number;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  /** The request whose change is running; its buttons are off so it cannot be sent twice. */
  busyId?: number;
  onMove: (request: DataRequest, status: Exclude<DataRequestStatus, 'open'>) => void;
  onReject: (request: DataRequest) => void;
  empty: ReactNode;
}

// The deadline: red when it is under three days away or past, plain otherwise; a closed request shows its date, muted.
function DueCell({ request, now }: { request: DataRequest; now: number }) {
  const due = isPending(request) ? dueOf(request.dueAt, now) : null;
  if (!due) return <span className="text-ink3">{fmtDay(request.dueAt) || '–'}</span>;
  return (
    <span className={due.late || due.soon ? 'font-medium text-crit-fg' : undefined}>{dueText(due)}</span>
  );
}

export function DataRequestTable({
  rows,
  state,
  error,
  onRetry,
  now,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  busyId,
  onMove,
  onReject,
  empty,
}: DataRequestTableProps) {
  const columns: DataTableColumn<DataRequest>[] = [
    {
      key: 'id',
      label: 'Request',
      render: (request) => <span className="mono font-medium">{requestNumber(request.id)}</span>,
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (request) => (
        <Link className="link" to={customerPath(request.customerId)}>
          {request.customerName}
        </Link>
      ),
    },
    { key: 'kind', label: 'Type', render: (request) => requestKindLabel(request.kind) },
    {
      key: 'received',
      label: 'Received',
      hide: 'sm',
      sortField: 'requestedAt',
      render: (request) => ago(request.requestedAt, now),
    },
    {
      key: 'due',
      label: 'Due',
      sortField: 'dueAt',
      render: (request) => <DueCell request={request} now={now} />,
    },
    {
      key: 'status',
      label: 'Status',
      sortField: 'status',
      render: (request) => {
        const badge = requestStatusBadge(request.status);
        return (
          <>
            <Badge tone={badge.tone} icon={badge.icon}>
              {badge.label}
            </Badge>
            {request.status === 'completed' && request.completedAt && (
              <p className="mt-0.5 text-2xs text-ink3">{ago(request.completedAt, now)}</p>
            )}
          </>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (request) =>
        isPending(request) && (
          <span className="flex flex-wrap justify-end gap-1.5">
            {request.status === 'open' && (
              <Button
                size="sm"
                disabled={busyId === request.id}
                onClick={() => onMove(request, 'in_progress')}
              >
                Mark in progress
              </Button>
            )}
            <Button size="sm" disabled={busyId === request.id} onClick={() => onMove(request, 'completed')}>
              Done
            </Button>
            <Button size="sm" disabled={busyId === request.id} onClick={() => onReject(request)}>
              Reject…
            </Button>
          </span>
        ),
    },
  ];

  return (
    <DataTable
      caption="Data requests"
      columns={columns}
      rows={rows}
      rowKey={(request) => request.id}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the data requests"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
