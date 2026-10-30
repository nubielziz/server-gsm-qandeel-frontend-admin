// RefundsTab: the "Refunds" tab. Ports tabRefunds and the rf-status / rf-retry / rf-approve / rf-decline actions of
// 53-p-refunds.js: the status filter, the table of refunds, and the approve and decline dialogs. Status, page and sort live in
// the address; the server filters, sorts and counts.
import { useState } from 'react';
import { Button, EmptyState, Panel, SegmentedControl, usePageClamp } from '@/components/ui';
import { useNow } from '@/lib/format';
import type { RefundGrants } from '../hooks/useRefundGrants';
import { useRefundView } from '../hooks/useRefundView';
import { useRefundsList } from '../hooks/useRefundsList';
import { useRetryRefund } from '../hooks/useRefundMutations';
import { REFUND_FILTERS } from '../lib/labels';
import { PAGE_SIZE } from '../lib/view';
import type { Refund } from '../types';
import { ApproveRefundDialog } from './ApproveRefundDialog';
import { DeclineRefundDialog } from './DeclineRefundDialog';
import { RefundActions } from './RefundActions';
import { RefundsTable } from './RefundsTable';

type DialogState = { kind: 'approve' | 'decline'; refund: Refund };

export interface RefundsTabProps {
  grants: RefundGrants;
  onOpenOrder?: (orderId: number) => void;
}

export function RefundsTab({ grants, onOpenOrder }: RefundsTabProps) {
  const { view, page, sort, setStatus, setPage, setSort } = useRefundView('refunds');
  const now = useNow();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const retry = useRetryRefund();
  const pageSize = PAGE_SIZE.refunds;
  const list = useRefundsList({ status: view.status, page, pageSize, sort, enabled: grants.ready });
  usePageClamp({
    page,
    pageSize,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage,
  });

  const filtered = view.status !== '';
  return (
    <>
      <Panel
        title="Refunds"
        sub="Failed unlocks are refunded automatically. Everything else (changed mind, wrong service, goodwill) waits here for a person."
        right={
          <SegmentedControl
            items={REFUND_FILTERS}
            value={view.status}
            onChange={setStatus}
            label="Refund status"
          />
        }
        flush
      >
        <RefundsTable
          rows={list.refunds}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
          now={now}
          sort={sort}
          onSortChange={setSort}
          pagination={{ page, pageSize, total: list.total ?? list.refunds.length }}
          onPageChange={setPage}
          onOpenOrder={onOpenOrder}
          empty={
            <EmptyState
              icon="undo"
              title={filtered ? 'No refunds with this status' : 'No refunds yet'}
              cta={filtered ? <Button onClick={() => setStatus('')}>Show all</Button> : undefined}
            >
              {filtered
                ? 'Choose another status to see more.'
                : 'Refunds appear here when a customer asks or an order fails.'}
            </EmptyState>
          }
          actions={(refund) => (
            <RefundActions
              refund={refund}
              grants={grants}
              onApprove={(target) => setDialog({ kind: 'approve', refund: target })}
              onDecline={(target) => setDialog({ kind: 'decline', refund: target })}
              onRetry={(target) => retry.mutate(target)}
              retrying={retry.isPending && retry.variables?.id === refund.id}
            />
          )}
        />
      </Panel>
      {dialog?.kind === 'approve' && (
        <ApproveRefundDialog
          refund={dialog.refund}
          onClose={() => setDialog(null)}
          onShowEntries={grants.can('ledger:read') ? onOpenOrder : undefined}
        />
      )}
      {dialog?.kind === 'decline' && (
        <DeclineRefundDialog refund={dialog.refund} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
