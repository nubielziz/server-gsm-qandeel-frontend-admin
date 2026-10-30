// JournalDialog: one journal entry behind a statement line (the demo's "View journal" button, `showJournals` in 20-ui.js): its kind,
// time, author, memo and lines. The lines come from the finance feature's ledger route, so the staff member needs `ledger:read`.
import { journalLabel, ledgerKindLabel, type LedgerEntry } from '@/features/finance';
import { Modal, QueryState, TypeTag } from '@/components/ui';
import { fmtDate, money, sum, toAmount } from '@/lib/format';
import { useJournal } from '../hooks/useClientWallet';

// The lines of one entry, debits and credits side by side, with the total. The API sends one signed amount per line:
// positive is a debit, negative a credit. Display only: the server guarantees the lines sum to zero.
function JournalLines({ entries }: { entries: readonly LedgerEntry[] }) {
  const total = sum(
    entries.filter((entry) => toAmount(entry.amount) > 0),
    (entry) => toAmount(entry.amount),
  );
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-ink3">
          <th className="py-1 text-start font-medium">Account</th>
          <th className="py-1 text-end font-medium">Debit</th>
          <th className="py-1 text-end font-medium">Credit</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const amount = toAmount(entry.amount);
          return (
            <tr key={entry.id} className="border-t border-line">
              <td className="py-1.5">
                <span className="mono">{entry.account.kind}</span>
                {entry.account.ownerName && <span className="text-ink3"> · {entry.account.ownerName}</span>}
              </td>
              <td className="py-1.5 text-end tabular-nums">{amount > 0 ? money(amount) : ''}</td>
              <td className="py-1.5 text-end tabular-nums">{amount < 0 ? money(-amount) : ''}</td>
            </tr>
          );
        })}
        <tr className="border-t border-line2 font-medium">
          <td className="py-1.5">Total</td>
          <td className="py-1.5 text-end tabular-nums">{money(total)}</td>
          <td className="py-1.5 text-end tabular-nums">{money(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** Loads one journal entry and shows its lines. */
export function JournalDialog({ transactionId, onClose }: { transactionId: number; onClose: () => void }) {
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
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <TypeTag>{ledgerKindLabel(entry.kind)}</TypeTag>
              <span className="text-xs text-ink3">
                {fmtDate(entry.createdAt)} · by {entry.createdBy.name ?? 'System'}
              </span>
            </div>
            <JournalLines entries={entry.entries} />
          </div>
        )}
      </QueryState>
    </Modal>
  );
}
