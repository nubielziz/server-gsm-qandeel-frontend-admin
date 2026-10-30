// PaymentDialog: one deposit's dialog: Review deposit PAY-… with Approve and credit / Reject… while pending, or its details and
// ledger entries once decided. Ports payDialog and `pay-approve` (45-p-finance.js); the server's refusal shows in the error slot.
import { useState } from 'react';
import { Button, ErrorState, Icon, Modal, SkeletonTable, errorText } from '@/components/ui';
import { money, useNow } from '@/lib/format';
import type { FinanceGrants } from '../hooks/useFinanceGrants';
import { useApprovePayment } from '../hooks/usePaymentMutations';
import { usePayment } from '../hooks/usePayment';
import { methodLabel, paymentLabel } from '../lib/payments';
import type { Payment } from '../types';
import { PaymentDetails } from './PaymentDetails';
import { PaymentLedgerDialog } from './PaymentLedgerDialog';
import { RejectPaymentDialog } from './RejectPaymentDialog';

export interface PaymentDialogProps {
  id: number;
  /** The row from the list, shown at once while the single read loads. */
  row?: Payment;
  grants: FinanceGrants;
  onClose: () => void;
}

export function PaymentDialog({ id, row, grants, onClose }: PaymentDialogProps) {
  const { payment, query } = usePayment(id, row);
  const approve = useApprovePayment();
  const now = useNow();
  const [view, setView] = useState<'review' | 'reject' | 'entries'>('review');

  if (!payment) {
    return (
      <Modal
        open
        onClose={onClose}
        title={`Deposit ${paymentLabel(id)}`}
        footer={<Button onClick={onClose}>Close</Button>}
      >
        {query.isError ? (
          <ErrorState
            title="Could not load this deposit"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <SkeletonTable cols={2} rows={5} />
        )}
      </Modal>
    );
  }
  if (view === 'reject') {
    return <RejectPaymentDialog payment={payment} onCancel={() => setView('review')} onRejected={onClose} />;
  }
  if (view === 'entries') return <PaymentLedgerDialog payment={payment} onClose={() => setView('review')} />;

  const fresh = payment.status === 'pending';
  const decide = grants.needs('payments:approve');
  const entries = grants.needs('ledger:read');
  return (
    <Modal
      open
      onClose={onClose}
      title={`${fresh ? 'Review deposit' : 'Deposit'} ${paymentLabel(payment.id)}`}
      sub={`${payment.client?.name ?? 'Merchant'} · ${methodLabel(payment)}`}
      dismissible={!approve.isPending}
      error={approve.error ? errorText(approve.error) : null}
      footer={
        fresh ? (
          <>
            <Button disabled={approve.isPending} onClick={onClose}>
              Close
            </Button>
            <Button
              variant="danger"
              disabled={decide.disabled || approve.isPending}
              title={decide.title}
              onClick={() => setView('reject')}
            >
              Reject…
            </Button>
            <Button
              variant="primary"
              loading={approve.isPending}
              disabled={decide.disabled}
              title={decide.title}
              onClick={() => approve.mutate(payment, { onSuccess: onClose })}
            >
              <Icon name="check" className="ic-sm" />
              Approve and credit {money(payment.netAmount)}
            </Button>
          </>
        ) : (
          <>
            <Button disabled={entries.disabled} title={entries.title} onClick={() => setView('entries')}>
              View ledger entries
            </Button>
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </>
        )
      }
    >
      <PaymentDetails payment={payment} now={now} canOpenFiles={grants.can('files:read')} />
    </Modal>
  );
}
