// DepositsTab: the deposit review queue of the Finance page: the Pending / Approved / Rejected / All switch with counts,
// the table, and the review dialog (also opened by `?payment=<id>`). Ports paymentsTab of 45-p-finance.js.
import { usePageClamp } from '@/components/ui';
import { useNow } from '@/lib/format';
import type { FinanceGrants } from '../hooks/useFinanceGrants';
import { useOpenRecord } from '../hooks/useOpenRecord';
import { usePaymentCounts } from '../hooks/usePaymentCounts';
import { usePaymentsList } from '../hooks/usePaymentsList';
import { usePaymentView } from '../hooks/usePaymentView';
import { PAGE_SIZE } from '../lib/url';
import { PaymentDialog } from './PaymentDialog';
import { PaymentFilterBar } from './PaymentFilterBar';
import { PaymentTable } from './PaymentTable';
import { PaymentsEmpty } from './PaymentsEmpty';

export function DepositsTab({ grants }: { grants: FinanceGrants }) {
  const view = usePaymentView();
  const dialog = useOpenRecord('payment');
  const now = useNow();
  const counts = usePaymentCounts(grants.ready);
  const list = usePaymentsList({
    filter: view.filter,
    page: view.page,
    pageSize: PAGE_SIZE,
    sort: view.sort,
  });
  // A shrinking list (a decision, an old link) must not leave the table on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });

  return (
    <>
      <PaymentFilterBar value={view.filter} counts={counts} onChange={view.setFilter} />
      <div className="border-t border-line">
        <PaymentTable
          rows={list.payments}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
          showStatus={view.filter === 'all'}
          now={now}
          sort={view.sort}
          onSortChange={view.setSort}
          pagination={{ page: view.page, pageSize: PAGE_SIZE, total: list.total ?? list.payments.length }}
          onPageChange={view.setPage}
          onOpen={(payment) => dialog.open(payment.id)}
          empty={
            <PaymentsEmpty
              filter={view.filter}
              anyDeposits={(counts.all ?? 0) > 0}
              onShowAll={() => view.setFilter('all')}
            />
          }
        />
      </div>
      {dialog.id !== null && (
        <PaymentDialog
          key={dialog.id}
          id={dialog.id}
          row={list.payments.find((payment) => payment.id === dialog.id)}
          grants={grants}
          onClose={dialog.close}
        />
      )}
    </>
  );
}
