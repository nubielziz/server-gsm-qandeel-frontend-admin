// DisputesTable: the card disputes table (dispute and order, customer, reason, amount at stake, evidence due, status, action).
// Ports the `cols` of tabDisputes in 53-p-refunds.js. It only draws what it is given: the tab owns the data, the sort and the page.
import type { ReactNode } from 'react';
import {
  Button,
  DataTable,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { lm, money0 } from '@/lib/format';
import { badgeFor, DISPUTE_BADGE, disputeLabel } from '../lib/labels';
import type { Dispute } from '../types';
import { CustomerLink } from './CustomerLink';
import { EvidenceDue } from './EvidenceDue';
import { OrderLink } from './OrderLink';
import { StatusBadge } from './StatusBadge';

export interface DisputesTableProps {
  rows: readonly Dispute[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  now: number;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  /** Opens an order's drawer; leave out when the staff member cannot read orders. */
  onOpenOrder?: (orderId: number) => void;
  /** "Prepare evidence" or "View" was pressed. */
  onOpen: (dispute: Dispute) => void;
  empty: ReactNode;
}

export function DisputesTable({
  rows,
  state,
  error,
  onRetry,
  now,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onOpenOrder,
  onOpen,
  empty,
}: DisputesTableProps) {
  const columns: DataTableColumn<Dispute>[] = [
    {
      key: 'id',
      label: 'Dispute',
      sortField: 'id',
      render: (dispute) => (
        <>
          <p className="mono font-medium">{disputeLabel(dispute.id)}</p>
          <p className="text-2xs">
            <OrderLink orderId={dispute.orderId} onOpen={onOpenOrder} />
          </p>
        </>
      ),
    },
    {
      key: 'who',
      label: 'Customer',
      hide: 'md',
      render: (dispute) => <CustomerLink customer={dispute.customer} />,
    },
    {
      key: 'reason',
      label: 'Reason',
      hide: 'sm',
      render: (dispute) => (
        <>
          <p className="text-ink2">{dispute.reasonCode}</p>
          {dispute.note && (
            <p className="max-w-[20rem] truncate text-2xs text-ink3" title={dispute.note}>
              {dispute.note}
            </p>
          )}
        </>
      ),
    },
    {
      key: 'amount',
      label: 'At stake',
      num: true,
      sortField: 'amount',
      render: (dispute) => (
        <>
          {lm(dispute.amount, dispute.currency, dispute.fx)}
          <p className="text-2xs text-ink3">+ {money0(dispute.fee)} fee</p>
        </>
      ),
    },
    {
      key: 'due',
      label: 'Evidence due',
      hide: 'lg',
      sortField: 'evidenceDueAt',
      render: (dispute) => <EvidenceDue dispute={dispute} now={now} />,
    },
    {
      key: 'status',
      label: 'Status',
      sortField: 'status',
      render: (dispute) => <StatusBadge spec={badgeFor(DISPUTE_BADGE, dispute.status)} />,
    },
    {
      key: 'actions',
      label: '',
      render: (dispute) => {
        const need = dispute.status === 'needs_response';
        return (
          <Button size="sm" variant={need ? 'primary' : 'default'} onClick={() => onOpen(dispute)}>
            {need ? 'Prepare evidence' : 'View'}
          </Button>
        );
      },
    },
  ];

  return (
    <DataTable
      caption="Card disputes"
      columns={columns}
      rows={rows}
      rowKey={(dispute) => dispute.id}
      state={state}
      error={error}
      errorTitle="Could not load disputes"
      onRetry={onRetry}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      empty={empty}
    />
  );
}
