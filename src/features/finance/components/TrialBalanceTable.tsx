// TrialBalanceTable: one line per account with its type and its debit or credit, an Entries button that opens the ledger
// on that account, and the totals the server sent. Ports the table of accountsTab in 45-p-finance.js.
import { Button } from '@/components/ui';
import { money } from '@/lib/format';
import type { TrialLine } from '../lib/accounts';

export interface TrialBalanceTableProps {
  lines: readonly TrialLine[];
  /** The server's totals; the two are equal when the books balance. */
  totalDebit: string;
  totalCredit: string;
  /** Opens the Ledger tab on one account kind. */
  onEntries: (kind: string) => void;
}

const dash = <span className="text-ink3">–</span>;

export function TrialBalanceTable({ lines, totalDebit, totalCredit, onEntries }: TrialBalanceTableProps) {
  return (
    <div className="tbl-wrap">
      <table className="tbl" aria-label="Trial balance">
        <thead>
          <tr>
            <th scope="col">Account</th>
            <th scope="col">Type</th>
            <th scope="col" className="num">
              Debit
            </th>
            <th scope="col" className="num">
              Credit
            </th>
            <th scope="col" className="w-24">
              <span className="sr-only">Entries</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.kind}>
              <td className="font-medium">
                {line.name}
                <span className="mono ms-2 text-2xs text-ink3">{line.kind}</span>
              </td>
              <td className="text-ink2">{line.type}</td>
              <td className="num">{line.debit ? money(line.debit) : dash}</td>
              <td className="num">{line.credit ? money(line.credit) : dash}</td>
              <td className="text-end">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`View ledger entries for ${line.name}`}
                  onClick={() => onEntries(line.kind)}
                >
                  Entries
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-medium">
            <td colSpan={2}>Total</td>
            <td className="num">{money(totalDebit)}</td>
            <td className="num">{money(totalCredit)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
