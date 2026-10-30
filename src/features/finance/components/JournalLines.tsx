// JournalLines: the lines of one journal entry, debits and credits side by side, with the total. Ports journalTable of
// 20-ui.js. The API sends one signed amount per line (positive is a debit, negative a credit, MISMATCHES M10).
import { money, sum, toAmount } from '@/lib/format';
import type { LedgerEntry } from '../types';

export function JournalLines({ entries }: { entries: readonly LedgerEntry[] }) {
  // Display only: the server guarantees the lines sum to zero, so the debit column is the entry's total.
  const total = sum(
    entries.filter((entry) => toAmount(entry.amount) > 0),
    (entry) => toAmount(entry.amount),
  );
  return (
    <table className="w-full text-xs" aria-label="Journal lines">
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
