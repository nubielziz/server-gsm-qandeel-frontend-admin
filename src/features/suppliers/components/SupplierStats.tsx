// SupplierStats: the four figures under the header: success in the last hour (with the 24-hour average), latency p50 and p95,
// open orders (with a link to them) and the prepaid balance (with how long it lasts). Ports `supStat` and the `stats` grid of
// supDetail in 44-p-suppliers.js. Every figure is the server's; the page only words it.
import { Link } from 'react-router';
import { ordersListPath } from '@/features/orders';
import { money, money0, pct, toAmount } from '@/lib/format';
import { belowTarget, msOrDash, runwayText } from '../lib/metrics';
import type { Supplier } from '../types';
import { SupplierStat } from './SupplierStat';

export interface SupplierStatsProps {
  supplier: Supplier;
  /** Whether the orders link is offered (the staff member can read orders). */
  canOpenOrders: boolean;
}

/** The four figures. A missing figure shows as a dash; colours follow the 90% target and the server's low-balance flag. */
export function SupplierStats({ supplier, canOpenOrders }: SupplierStatsProps) {
  const rate = supplier.successRate1h;
  // The 24-hour figure is the server's; the page does not average the history itself.
  const average = supplier.successRate24h;
  const ordersLink = (label: string) =>
    canOpenOrders ? (
      <Link className="link" to={ordersListPath({ tab: 'open', supplierId: String(supplier.id) })}>
        {label}
      </Link>
    ) : null;
  // "Below the minimum" is told from the two amounts for the sentence only; whether the balance is low is the server's flag.
  const belowAlert = toAmount(supplier.balance) < toAmount(supplier.lowBalanceAlert);
  const runway = runwayText(supplier.runwayDays);

  return (
    <div className="grid grid-cols-2 border-b border-line lg:grid-cols-4 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-line lg:[&>*:nth-child(n+3)]:border-t-0 [&>*:nth-child(even)]:border-s [&>*:nth-child(even)]:border-line lg:[&>*:nth-child(odd)]:border-s lg:[&>*:nth-child(1)]:border-s-0">
      <SupplierStat
        label="Success, last hour"
        value={rate === null ? '–' : pct(rate, 1)}
        sub={`24 h average ${average === null ? '–' : pct(average, 1)}`}
        className={belowTarget(rate) ? 'text-serious-fg' : undefined}
      />
      <SupplierStat
        label="Latency p50 / p95"
        value={
          <>
            {msOrDash(supplier.p50Ms)}{' '}
            <span className="text-sm font-normal text-ink3">/ {msOrDash(supplier.p95Ms)}</span>
          </>
        }
        sub="Median and slowest 5%"
      />
      <SupplierStat
        label="Open orders"
        value={String(supplier.openOrders)}
        sub={
          supplier.reviewOrders > 0 ? (
            <>
              <span className="font-medium text-serious-fg">{supplier.reviewOrders} need review</span>
              {canOpenOrders && ' · '}
              {ordersLink('View')}
            </>
          ) : (
            ordersLink('View orders')
          )
        }
      />
      <SupplierStat
        label="Prepaid balance"
        value={money(supplier.balance)}
        sub={
          supplier.lowBalance ? (
            <span className="font-medium text-warn-fg">
              {belowAlert ? `Below the ${money0(supplier.lowBalanceAlert)} minimum` : runway}
            </span>
          ) : (
            runway
          )
        }
        className={supplier.lowBalance ? 'text-warn-fg' : undefined}
      />
    </div>
  );
}
