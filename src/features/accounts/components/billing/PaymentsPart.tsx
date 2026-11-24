// PaymentsPart: the "Payments" part of the record, a list: the wallet top-ups of one account (either wallet kind; the server lists nothing else, so
// a guest, who never tops up, has no such part), newest first, with the number linking to the payment in Finance, the method, the status, the
// amount and the day. The page and its size are the part's own state; the footer pager is pinned. The read filters by `accountId`, never `customerId`.
import { useState } from 'react';
import { Link } from 'react-router';
import {
  DataTable,
  EmptyState,
  FooterPager,
  RefreshTool,
  usePageClamp,
  type DataTableColumn,
} from '@/components/ui';
import {
  financePaymentPath,
  methodLabel,
  PaymentStatusBadge,
  paymentLabel,
  type Payment,
} from '@/features/finance';
import { fmtDate, money } from '@/lib/format';
import { DEFAULT_PAGE_SIZE } from '../../lib/paths';
import type { AccountPartProps } from '../types';
import { useAccountPaymentList } from './useAccountPaymentList';

const COLUMNS: DataTableColumn<Payment>[] = [
  {
    key: 'payment',
    label: 'Payment',
    render: (payment) => (
      <Link className="link mono font-medium" to={financePaymentPath(payment.id)}>
        {paymentLabel(payment.id)}
      </Link>
    ),
  },
  { key: 'method', label: 'Method', hide: 'sm', render: (payment) => methodLabel(payment) },
  { key: 'status', label: 'Status', render: (payment) => <PaymentStatusBadge status={payment.status} /> },
  { key: 'amount', label: 'Amount', num: true, render: (payment) => money(payment.amount) },
  { key: 'created', label: 'Created', hide: 'sm', render: (payment) => fmtDate(payment.createdAt) },
];

/**
 * The wallet top-ups of the account.
 *
 * @param props.account the account whose payments are listed.
 * @see GET /admin/payments
 */
export function PaymentsPart({ account }: AccountPartProps) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const payments = useAccountPaymentList({ accountId: account.id, page, pageSize: size });
  const rows = payments.data?.data ?? [];
  const total = payments.data?.total;
  usePageClamp({
    page,
    pageSize: size,
    total,
    settled: payments.isSuccess && !payments.isPlaceholderData,
    setPage,
  });

  return (
    <div className="view-frame">
      <div>
        <RefreshTool onRefresh={() => void payments.refetch()} busy={payments.isFetching} />
        <DataTable
          skin="list"
          footer={false}
          caption="Payments"
          columns={COLUMNS}
          rows={rows}
          rowKey={(payment) => payment.id}
          state={payments.isLoading ? 'loading' : payments.isError ? 'error' : 'ready'}
          error={payments.error}
          errorTitle="Could not load the payments"
          onRetry={() => void payments.refetch()}
          empty={
            <EmptyState icon="wallet" title="No payments">
              Payments this account makes show here.
            </EmptyState>
          }
        />
      </div>
      <FooterPager
        page={page}
        pageSize={size}
        total={total ?? rows.length}
        onPage={setPage}
        onPageSize={(next) => {
          setSize(next);
          setPage(1);
        }}
      />
    </div>
  );
}
