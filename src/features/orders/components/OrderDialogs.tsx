// OrderDialogs: renders the dialog the page or the drawer has open (complete, reject, refund, reopen, verification, pricing
// trace, ledger entries, bulk reply). Each dialog is mounted only while open, so it always starts with empty fields.
import type { BulkSummary } from '../lib/bulk';
import type { Order } from '../types';
import { BulkReplyDialog } from './BulkReplyDialog';
import { CompleteDialog } from './CompleteDialog';
import { LedgerDialog } from './LedgerDialog';
import type { OrderDialogState } from './orderDialogState';
import { RefundDialog } from './RefundDialog';
import { RejectDialog } from './RejectDialog';
import { ReopenDialog } from './ReopenDialog';
import { TraceDialog } from './TraceDialog';
import { VerificationDialog } from './VerificationDialog';

export interface OrderDialogsProps {
  dialog: OrderDialogState | null;
  /** Closes the dialog, or swaps it for another one (the ledger entries from a success toast). */
  onChange: (next: OrderDialogState | null) => void;
  /**
   * An action on one or many orders ended: the page unticks the orders it covered (`covered`; none for the bulk reply,
   * which works on pasted lines) and shows what was refused.
   */
  onBulkDone?: (summary: BulkSummary, covered: readonly Order[]) => void;
}

export function OrderDialogs({ dialog, onChange, onBulkDone }: OrderDialogsProps) {
  const close = () => onChange(null);
  const done = (covered: readonly Order[]) => (summary: BulkSummary) => onBulkDone?.(summary, covered);
  const viewLedger = (order: Order) => onChange({ kind: 'ledger', order });

  return (
    <>
      {dialog?.kind === 'complete' && (
        <CompleteDialog
          orders={dialog.orders}
          onClose={close}
          onDone={done(dialog.orders)}
          onViewLedger={viewLedger}
        />
      )}
      {dialog?.kind === 'reject' && (
        <RejectDialog orders={dialog.orders} onClose={close} onDone={done(dialog.orders)} />
      )}
      {dialog?.kind === 'refund' && (
        <RefundDialog order={dialog.order} onClose={close} onViewLedger={viewLedger} />
      )}
      {dialog?.kind === 'reopen' && <ReopenDialog order={dialog.order} onClose={close} />}
      {dialog?.kind === 'verify' && (
        <VerificationDialog order={dialog.order} decision={dialog.decision} onClose={close} />
      )}
      {dialog?.kind === 'trace' && <TraceDialog order={dialog.order} onClose={close} />}
      {dialog?.kind === 'ledger' && <LedgerDialog order={dialog.order} onClose={close} />}
      {dialog?.kind === 'bulk-reply' && <BulkReplyDialog onClose={close} onDone={done([])} />}
    </>
  );
}
