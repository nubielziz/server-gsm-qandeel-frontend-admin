// JournalDialog: one journal entry behind a statement line: its kind, time, author, memo and lines. The lines come from the finance feature's
// ledger route and its `JournalLines`, so the staff member needs `ledger:read` (the button that opens it is locked without it).
import { Modal, QueryState } from '@/components/ui';
import { journalLabel, JournalLines, ledgerKindLabel, postedBy } from '@/features/finance';
import { fmtDate } from '@/lib/format';
import { useJournal } from '../../hooks/useAccountWallet';

export interface JournalDialogProps {
  /** The journal of the statement line (`StatementRow.transactionId`). */
  transactionId: number;
  onClose: () => void;
}

/**
 * Loads one journal entry and shows its lines. A failed read shows its error with Retry inside the dialog.
 *
 * @param props see `JournalDialogProps`.
 * @see GET /admin/ledger/transactions/:id
 */
export function JournalDialog({ transactionId, onClose }: JournalDialogProps) {
  const journal = useJournal(transactionId);
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
            <p className="mb-1 text-sm text-ink2">
              <span className="font-medium text-ink">{ledgerKindLabel(entry.kind)}</span>
              <span className="text-xs text-ink3">
                {' · '}
                {fmtDate(entry.createdAt)} · by {postedBy(entry.createdBy)}
              </span>
            </p>
            <JournalLines entries={entry.entries} />
          </div>
        )}
      </QueryState>
    </Modal>
  );
}
