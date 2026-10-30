// PaymentMethodTable: "Payment methods compared", one row per way of paying with its volume, fees, fee rate and how often it
// ends in a refund or a dispute. Ports the `summary` table of tabPayments in 53-p-refunds.js. Every figure is the server's.
import { ErrorState, SkeletonTable } from '@/components/ui';
import { money, money0, num, pct } from '@/lib/format';
import { METHOD_LABEL } from '../lib/labels';
import type { PaymentMethodSummary } from '../types';

export interface PaymentMethodTableProps {
  methods: readonly PaymentMethodSummary[] | undefined;
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
}

export function PaymentMethodTable({ methods, state, error, onRetry }: PaymentMethodTableProps) {
  if (state === 'loading') return <SkeletonTable cols={7} rows={3} />;
  if (state === 'error') {
    return <ErrorState title="Could not load the payment methods" error={error} onRetry={onRetry} />;
  }
  return (
    <div className="tbl-wrap">
      <table className="tbl" aria-label="Payment methods compared">
        <thead>
          <tr>
            <th scope="col">Method</th>
            <th scope="col" className="num">
              Payments
            </th>
            <th scope="col" className="num">
              Volume
            </th>
            <th scope="col" className="num">
              Gateway fees
            </th>
            <th scope="col" className="num hidden sm:table-cell">
              Fee rate
            </th>
            <th scope="col" className="num hidden md:table-cell">
              Refunds
            </th>
            <th scope="col" className="num hidden md:table-cell">
              Disputes
            </th>
          </tr>
        </thead>
        <tbody>
          {(methods ?? []).map((row) => (
            <tr key={row.method}>
              <td className="font-medium">{METHOD_LABEL[row.method] ?? row.method}</td>
              <td className="num">{num(row.payments)}</td>
              <td className="num">{money0(row.volume)}</td>
              <td className="num">{money(row.fees)}</td>
              <td className="num hidden sm:table-cell">{pct(row.feeRate)}</td>
              <td className="num hidden md:table-cell">{num(row.refunds)}</td>
              <td className="num hidden md:table-cell">{num(row.disputes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
