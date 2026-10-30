// PaymentsTab: the "Payments" tab. Ports tabPayments and the rf-method action of 53-p-refunds.js: the comparison of payment
// methods and the storefront payments table with its method filter. Both come from one report call
// (`GET /admin/reports/payments`); the method, page and sort live in the address.
import { EmptyState, Panel, SegmentedControl, usePageClamp } from '@/components/ui';
import { useNow } from '@/lib/format';
import type { RefundGrants } from '../hooks/useRefundGrants';
import { useRefundView } from '../hooks/useRefundView';
import { usePaymentsReport } from '../hooks/usePaymentsReport';
import { METHOD_FILTERS } from '../lib/labels';
import { PAGE_SIZE } from '../lib/view';
import { PaymentMethodTable } from './PaymentMethodTable';
import { PaymentsTable } from './PaymentsTable';

export interface PaymentsTabProps {
  grants: RefundGrants;
  onOpenOrder?: (orderId: number) => void;
}

export function PaymentsTab({ grants, onOpenOrder }: PaymentsTabProps) {
  const { view, page, sort, setMethod, setPage, setSort } = useRefundView('payments');
  const now = useNow();
  const pageSize = PAGE_SIZE.payments;
  const report = usePaymentsReport({ method: view.method, page, pageSize, sort, enabled: grants.ready });
  usePageClamp({
    page,
    pageSize,
    total: report.data?.total,
    settled: report.isSuccess && !report.isPlaceholderData,
    setPage,
  });

  const state = report.isLoading ? 'loading' : report.isError ? 'error' : 'ready';
  return (
    <div className="grid gap-4">
      <Panel
        title="By payment method"
        sub="What each way of paying costs you and how often it ends in a refund or dispute."
        flush
      >
        <PaymentMethodTable
          methods={report.data?.methods}
          state={state}
          error={report.error}
          onRetry={() => void report.refetch()}
        />
      </Panel>
      <Panel
        title="Storefront payments"
        right={
          <SegmentedControl
            items={METHOD_FILTERS}
            value={view.method}
            onChange={setMethod}
            label="Payment method"
          />
        }
        flush
      >
        <PaymentsTable
          rows={report.data?.payments ?? []}
          state={state}
          error={report.error}
          onRetry={() => void report.refetch()}
          now={now}
          sort={sort}
          onSortChange={setSort}
          pagination={{ page, pageSize, total: report.data?.total ?? 0 }}
          onPageChange={setPage}
          onOpenOrder={onOpenOrder}
          empty={
            <EmptyState icon="wallet" title="No payments">
              Storefront payments appear here the moment they are captured.
            </EmptyState>
          }
        />
      </Panel>
    </div>
  );
}
