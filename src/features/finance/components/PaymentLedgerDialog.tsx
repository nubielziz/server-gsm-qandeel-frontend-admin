// PaymentLedgerDialog: "Ledger entries for PAY-…", the journals posted when a deposit was approved. Ports
// showJournals('payment', id) of 20-ui.js: each entry with its kind, time, author, memo and lines.
import { Button, Modal, QueryState, TypeTag } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { usePaymentEntries } from '../hooks/usePaymentEntries';
import { journalLabel, ledgerKindLabel } from '../lib/kinds';
import { paymentLabel } from '../lib/payments';
import type { Payment } from '../types';
import { JournalLines } from './JournalLines';

export function PaymentLedgerDialog({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const trail = usePaymentEntries(payment.id);
  const entries = trail.data ?? [];
  return (
    <Modal
      open
      size="lg"
      title={`Ledger entries for ${paymentLabel(payment.id)}`}
      sub={
        trail.isSuccess
          ? `${entries.length} ${entries.length === 1 ? 'journal' : 'journals'} posted. Debits equal credits in each.`
          : undefined
      }
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          Back
        </Button>
      }
    >
      <QueryState
        isLoading={trail.isLoading}
        isError={trail.isError}
        error={trail.error}
        onRetry={() => void trail.refetch()}
        errorTitle="Could not load the ledger entries"
        isEmpty={entries.length === 0}
        empty={<p className="text-sm text-ink2">No journals posted yet.</p>}
      >
        {entries.map((entry) => (
          <div key={entry.id} className="mb-4 last:mb-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="mono font-medium">{journalLabel(entry.id)}</span>
              <TypeTag>{ledgerKindLabel(entry.kind)}</TypeTag>
              <span className="text-xs text-ink3">
                {fmtDate(entry.createdAt)} · by {entry.createdBy.name ?? 'System'}
              </span>
            </div>
            <p className="mb-1 text-sm text-ink2">{entry.memo}</p>
            <JournalLines entries={entry.entries} />
          </div>
        ))}
      </QueryState>
    </Modal>
  );
}
