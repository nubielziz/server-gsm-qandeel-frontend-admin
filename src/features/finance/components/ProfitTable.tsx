// ProfitTable: the profit report as a table: one row per day, service, supplier or merchant, and the totals the server sent.
// New (MISMATCHES M124). A merchant or supplier row links to its page. A day is shown newest first, as the chart's table twin.
import { Link } from 'react-router';
import { money, num } from '@/lib/format';
import { dayLabel } from '../lib/reports';
import type { ProfitGroup, ProfitReport, ProfitRow } from '../types';

const COLUMN: Record<ProfitGroup, string> = {
  day: 'Day',
  service: 'Service',
  supplier: 'Supplier',
  client: 'Merchant',
};

// Where a row's name leads: the merchant's page or the suppliers page with that supplier selected.
function linkOf(group: ProfitGroup, row: ProfitRow): string | null {
  if (group === 'client' && /^\d+$/.test(row.key)) return `/merchants/${row.key}`;
  if (group === 'supplier' && /^\d+$/.test(row.key)) return `/suppliers?supplier=${row.key}`;
  return null;
}

const profitClass = (value: string) => (value.startsWith('-') ? 'num text-crit-fg' : 'num');

export function ProfitTable({ report }: { report: ProfitReport }) {
  const rows =
    report.groupBy === 'day' ? report.rows.slice().sort((a, b) => b.key.localeCompare(a.key)) : report.rows;
  return (
    <div className="tbl-wrap max-h-[420px] border-t border-line">
      <table className="tbl" aria-label={`Profit by ${COLUMN[report.groupBy].toLowerCase()}`}>
        <thead>
          <tr>
            <th scope="col">{COLUMN[report.groupBy]}</th>
            <th scope="col" className="num">
              Orders
            </th>
            <th scope="col" className="num">
              Revenue
            </th>
            <th scope="col" className="num">
              Cost
            </th>
            <th scope="col" className="num">
              Profit
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const to = linkOf(report.groupBy, row);
            const label = report.groupBy === 'day' ? dayLabel(row.key) : row.label;
            return (
              <tr key={row.key}>
                <td className="font-medium">
                  {to ? (
                    <Link className="link" to={to}>
                      {label}
                    </Link>
                  ) : (
                    label
                  )}
                </td>
                <td className="num">{num(row.orders)}</td>
                <td className="num">{money(row.revenue)}</td>
                <td className="num">{money(row.cost)}</td>
                <td className={profitClass(row.profit)}>{money(row.profit)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-medium">
            <td>Total</td>
            <td className="num">{num(report.totals.orders)}</td>
            <td className="num">{money(report.totals.revenue)}</td>
            <td className="num">{money(report.totals.cost)}</td>
            <td className={profitClass(report.totals.profit)}>{money(report.totals.profit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
