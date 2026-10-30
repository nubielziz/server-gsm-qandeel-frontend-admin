// DisputesTab: the "Card disputes" tab. Ports tabDisputes and the dp-open / dp-accept actions of 53-p-refunds.js: the table of
// disputes with their evidence deadline, the dispute dialog with the evidence pack, and the confirm for accepting the loss.
import { useState } from 'react';
import { EmptyState, Panel, usePageClamp } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useDisputesList } from '../hooks/useDisputesList';
import type { RefundGrants } from '../hooks/useRefundGrants';
import { useRefundView } from '../hooks/useRefundView';
import { PAGE_SIZE } from '../lib/view';
import type { Dispute } from '../types';
import { AcceptLossDialog } from './AcceptLossDialog';
import { DisputeDialog } from './DisputeDialog';
import { DisputesTable } from './DisputesTable';

type DialogState = { kind: 'view' | 'accept'; dispute: Dispute };

export interface DisputesTabProps {
  grants: RefundGrants;
  onOpenOrder?: (orderId: number) => void;
}

export function DisputesTab({ grants, onOpenOrder }: DisputesTabProps) {
  const { page, sort, setPage, setSort } = useRefundView('disputes');
  const now = useNow();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const pageSize = PAGE_SIZE.disputes;
  const list = useDisputesList({ page, pageSize, sort, enabled: grants.ready });
  // A shrinking list or an old `?page=9` link must not leave the table on an empty page.
  usePageClamp({
    page,
    pageSize,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage,
  });

  return (
    <>
      <Panel
        title="Card disputes"
        sub="A dispute is a customer asking their bank to take the money back. You have a few days to send proof; missing the date loses it automatically."
        flush
      >
        <DisputesTable
          rows={list.disputes}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
          now={now}
          sort={sort}
          onSortChange={setSort}
          pagination={{ page, pageSize, total: list.total ?? list.disputes.length }}
          onPageChange={setPage}
          onOpenOrder={onOpenOrder}
          onOpen={(dispute) => setDialog({ kind: 'view', dispute })}
          empty={
            <EmptyState icon="scale" title="No disputes">
              When a customer disputes a payment with their bank, it is listed here with a deadline.
            </EmptyState>
          }
        />
      </Panel>
      {dialog?.kind === 'view' && (
        <DisputeDialog
          dispute={dialog.dispute}
          grants={grants}
          now={now}
          onClose={() => setDialog(null)}
          onAccept={(dispute) => setDialog({ kind: 'accept', dispute })}
        />
      )}
      {dialog?.kind === 'accept' && (
        <AcceptLossDialog dispute={dialog.dispute} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
