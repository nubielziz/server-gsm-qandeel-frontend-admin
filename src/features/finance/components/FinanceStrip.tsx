// FinanceStrip: the five key figures under the page title. Ports finStrip of 45-p-finance.js. Every figure comes from the
// server (the trial balance, the wallet exposure report, the pending-deposit count); a figure the staff member may not
// read is left out, and one still loading shows a grey bar.
import { Skeleton } from '@/components/ui';
import { money0, num, toAmount } from '@/lib/format';
import type { FinanceStrip as StripData } from '../hooks/useFinanceStrip';
import { balanceOf } from '../lib/accounts';

type Cell = { id: string; label: string; value?: string; sub: string; className?: string; failed: boolean };

// Full class names so Tailwind can see them.
const COLUMNS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
};

function cellsOf(strip: StripData): Cell[] {
  const rows = strip.trial.data?.rows;
  const totals = strip.exposure.data?.totals;
  const cells: Cell[] = [];
  if (strip.canLedger) {
    cells.push({
      id: 'bank',
      label: 'Bank',
      value: rows && money0(balanceOf(rows, 'bank')?.balance ?? 0),
      sub: 'Cash received minus paid out',
      failed: strip.trial.isError,
    });
  }
  if (strip.canReports) {
    const overdrawn =
      totals && toAmount(totals.overdraftUsed) > 0 ? ` · ${money0(totals.overdraftUsed)} overdrawn` : '';
    cells.push(
      {
        id: 'wallets',
        label: 'Merchant wallets',
        value: totals && money0(totals.balance),
        sub: `What you owe merchants${overdrawn}`,
        failed: strip.exposure.isError,
      },
      {
        id: 'held',
        label: 'Held in open orders',
        value: totals && money0(totals.reserved),
        sub: 'Reserved until each order settles',
        failed: strip.exposure.isError,
      },
    );
  }
  if (strip.canLedger) {
    const prepaid = rows && balanceOf(rows, 'supplier_prepaid');
    cells.push({
      id: 'prepaid',
      label: 'Supplier prepaid',
      value: rows && money0(prepaid?.balance ?? 0),
      sub: prepaid
        ? `Balance across ${prepaid.accounts} ${prepaid.accounts === 1 ? 'supplier' : 'suppliers'}`
        : 'Balance with suppliers',
      failed: strip.trial.isError,
    });
  }
  if (strip.canPayments) {
    const waiting = strip.pending.data;
    cells.push({
      id: 'waiting',
      label: 'Waiting for review',
      value: waiting === undefined ? undefined : num(waiting),
      sub: waiting === 1 ? 'deposit to approve or reject' : 'deposits to approve or reject',
      className: waiting ? 'text-warn-fg' : undefined,
      failed: strip.pending.isError,
    });
  }
  return cells;
}

export function FinanceStrip({ strip }: { strip: StripData }) {
  const cells = cellsOf(strip);
  if (cells.length === 0) return null;
  return (
    <section
      aria-label="Key figures"
      className={`panel mb-4 grid grid-cols-2 ${COLUMNS[cells.length]} [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-line md:[&>*:nth-child(n+3)]:border-t-0 [&>*:nth-child(even)]:border-s [&>*:nth-child(even)]:border-line md:[&>*:nth-child(n+2)]:border-s md:[&>*:nth-child(n+2)]:border-line`}
    >
      {cells.map((cell) => (
        <div key={cell.id} className="min-w-0 p-3.5">
          <p className="text-xs text-ink3">{cell.label}</p>
          <div className={`mt-1 text-lg font-semibold tabular-nums tracking-tight ${cell.className ?? ''}`}>
            {cell.failed ? (
              <span title="Could not load this figure">–</span>
            ) : cell.value === undefined ? (
              <Skeleton width={72} height={20} />
            ) : (
              cell.value
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-ink3" title={cell.sub}>
            {cell.sub}
          </p>
        </div>
      ))}
    </section>
  );
}
