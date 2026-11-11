// PaymentTable: the deposits table with the demo's columns (submitted, deposit, paid by, method, amount, credited, status).
// Ports the `cols` of paymentsTab in 45-p-finance.js. It only draws what it is given: the tab owns the data, the sort and the
// page. The Status column is only there on the All sub-tab, since a status sub-tab already says it. "Paid by" is the merchant, or
// (feature 21) the storefront customer whose store balance the top-up fills, with a link to their wallet and a chip for a chargeback.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { DataTable, type DataTableColumn, type PaginationState, type SortState } from '@/components/ui';
import { ago, maskEmail, money, toAmount } from '@/lib/format';
import { customerWalletPath, methodLabel, paymentLabel } from '../lib/payments';
import type { Payment } from '../types';
import { PaymentDisputeChip } from './PaymentDisputeChip';
import { PaymentStatusBadge } from './PaymentStatusBadge';

export interface PaymentTableProps {
  rows: readonly Payment[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  /** Show the Status column (the All sub-tab). */
  showStatus: boolean;
  /** From `useNow`, so the ages move together and a test can fix them. */
  now: number;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onOpen: (payment: Payment) => void;
  empty: ReactNode;
}

export function PaymentTable({
  rows,
  state,
  error,
  onRetry,
  showStatus,
  now,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onOpen,
  empty,
}: PaymentTableProps) {
  const columns: DataTableColumn<Payment>[] = [
    {
      key: 'created',
      label: 'Submitted',
      sortField: 'createdAt',
      render: (payment) => <span className="whitespace-nowrap text-ink2">{ago(payment.createdAt, now)}</span>,
    },
    {
      key: 'id',
      label: 'Deposit',
      sortField: 'id',
      render: (payment) => (
        <button type="button" className="link mono font-medium" onClick={() => onOpen(payment)}>
          {paymentLabel(payment.id)}
        </button>
      ),
    },
    {
      key: 'merchant',
      label: 'Paid by',
      render: (payment) => (
        <>
          {payment.client || !payment.customer ? (
            <span className="font-medium">{payment.client?.name ?? '–'}</span>
          ) : (
            <>
              <Link className="link font-medium" to={customerWalletPath(payment.customer.id)}>
                {payment.customer.name}
              </Link>
              <span className="text-xs text-ink3"> · customer · {maskEmail(payment.customer.email)}</span>
            </>
          )}
          {payment.dispute && (
            <p className="py-0.5">
              <PaymentDisputeChip dispute={payment.dispute} />
            </p>
          )}
          {payment.note && (
            <p
              className={`max-w-[380px] py-0.5 text-xs ${payment.status === 'pending' ? 'text-warn-fg' : 'text-ink3'}`}
            >
              {payment.note}
            </p>
          )}
        </>
      ),
    },
    { key: 'method', label: 'Method', hide: 'md', render: (payment) => methodLabel(payment) },
    {
      key: 'amount',
      label: 'Amount',
      num: true,
      sortField: 'amount',
      render: (payment) => money(payment.amount),
    },
    {
      key: 'net',
      label: 'Credited',
      num: true,
      hide: 'lg',
      render: (payment) => (
        <>
          {money(payment.netAmount)}
          {toAmount(payment.feeAmount) > 0 && (
            <p className="text-xs text-ink3">fee {money(payment.feeAmount)}</p>
          )}
        </>
      ),
    },
    ...(showStatus
      ? [
          {
            key: 'status',
            label: 'Status',
            sortField: 'status',
            render: (payment: Payment) => <PaymentStatusBadge status={payment.status} />,
          },
        ]
      : []),
    {
      key: 'act',
      label: '',
      className: 'w-24',
      // Decorative: the Deposit number is the keyboard path, and a click anywhere on the row opens the same dialog.
      render: (payment) => (
        <span className="btn btn-sm" aria-hidden="true">
          {payment.status === 'pending' ? 'Review' : 'Details'}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      caption="Deposits"
      columns={columns}
      rows={rows}
      rowKey={(payment) => payment.id}
      onRowClick={onOpen}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the deposits"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
