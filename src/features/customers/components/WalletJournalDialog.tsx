// WalletJournalDialog: one journal entry behind a statement line (the "View journal" button): its kind, time, author, memo and lines.
// The lines come from the finance feature's ledger route and `JournalLines`, so the staff member needs `ledger:read`.
import { Modal, QueryState, TypeTag } from '@/components/ui';
import { journalLabel, JournalLines, ledgerKindLabel, postedBy } from '@/features/finance';
import { fmtDate } from '@/lib/format';
import { useCustomerJournal } from '../hooks/useCustomerWallet';

/** Loads one journal entry and shows its lines. */
export function WalletJournalDialog({
  transactionId,
  onClose,
}: {
  transactionId: number;
  onClose: () => void;
}) {
  const journal = useCustomerJournal(transactionId);
  const entry = journal.data;

  return (
    <Modal
      open
      size="lg"
      title={entry ? `${journalLabel(entry.id)} · ${entry.memo}` : 'Ledger entry'}
      sub="Debits equal credits in each journal."
      onClose={onClose}
    >
      <QueryState
        isLoading={journal.isLoading}
        isError={journal.isError}
        error={journal.error}
        onRetry={() => void journal.refetch()}
        errorTitle="Could not load the ledger entry"
      >
        {entry && (
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <TypeTag>{ledgerKindLabel(entry.kind)}</TypeTag>
              <span className="text-xs text-ink3">
                {fmtDate(entry.createdAt)} · by {postedBy(entry.createdBy)}
              </span>
            </div>
            <JournalLines entries={entry.entries} />
          </div>
        )}
      </QueryState>
    </Modal>
  );
}
