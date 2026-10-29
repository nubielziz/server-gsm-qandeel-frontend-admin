// OrderMoney: the "Money" box of the drawer: what the buyer paid, the supplier cost and the profit, where the money sits, which
// price rule applied, and the two links "How was this priced?" and "Ledger entries". Ports the money table of orderDrawer in
// 41-p-orders.js. Everything shown is read from the order; the sums are display only. The payment and risk block of a storefront
// order is not on the order (MISMATCHES M30).
import type { ReactNode } from 'react';
import { Button } from '@/components/ui';
import { lm, money, pct, toAmount } from '@/lib/format';
import type { OrderGrants } from '../hooks/useOrderGrants';
import { orderFx, orderGross, orderProfit, orderTaxRate } from '../lib/money';
import { PRICE_SOURCE_LABEL } from '../lib/trace';
import type { Order } from '../types';

// Where the order's money sits now, in the ledger's words (the demo's `wallet`).
function whereIsTheMoney(order: Order): string {
  if (order.status === 'completed') return 'Settled to revenue';
  if (order.status === 'rejected')
    return order.channel === 'b2c' ? 'Refunded to the customer' : 'Released to wallet';
  return order.channel === 'b2c' ? 'Held in customer_funds' : 'Held in client_hold';
}

function Row({
  label,
  value,
  strong = false,
  bad = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  bad?: boolean;
}) {
  return (
    <tr>
      <td className="px-3 py-2 text-ink2">{label}</td>
      <td
        className={`px-3 py-2 text-end tabular-nums ${strong ? 'font-medium' : ''} ${bad ? 'text-crit-fg' : ''}`}
      >
        {value}
      </td>
    </tr>
  );
}

export interface OrderMoneyProps {
  order: Order;
  grants: OrderGrants;
  onTrace: () => void;
  onLedger: () => void;
}

export function OrderMoney({ order, grants, onTrace, onLedger }: OrderMoneyProps) {
  const b2c = order.channel === 'b2c';
  const profit = orderProfit(order);
  const price = toAmount(order.totalPrice);
  const source = typeof order.pricingSnapshot?.source === 'string' ? order.pricingSnapshot.source : 'base';
  const rate = orderTaxRate(order);
  return (
    <>
      <h3 className="mb-1.5 text-xs font-medium text-ink3">Money</h3>
      <div className="mb-5 rounded-lg border border-line">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line">
            {b2c ? (
              <>
                <Row
                  strong
                  label="Customer paid"
                  value={
                    <>
                      {lm(orderGross(order), order.currency, orderFx(order))}
                      {order.currency !== 'USD' && (
                        <p className="text-2xs font-normal text-ink3">
                          {money(orderGross(order))} at {orderFx(order)} {order.currency}
                        </p>
                      )}
                    </>
                  }
                />
                {toAmount(order.taxAmount) > 0 && (
                  <Row label={`VAT ${pct(rate)}`} value={money(order.taxAmount)} />
                )}
                <Row label="Price before VAT" value={money(order.totalPrice)} />
              </>
            ) : (
              <Row strong label="Charged to merchant" value={money(order.totalPrice)} />
            )}
            <Row label="Supplier cost" value={money(order.totalCost)} />
            <Row
              strong
              bad={profit < 0}
              label="Profit"
              value={
                <>
                  {money(profit)}{' '}
                  {price !== 0 && (
                    <span className="font-normal text-ink3">{pct((profit / price) * 100, 1)}</span>
                  )}
                </>
              }
            />
          </tbody>
        </table>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-sunken px-3 py-2 text-xs text-ink3">
          <span>{whereIsTheMoney(order)}</span>
          <span aria-hidden="true">·</span>
          <span>{PRICE_SOURCE_LABEL[source] ?? 'Base price'}</span>
          <span className="flex-1" />
          <Button variant="ghost" size="sm" className="!h-auto !px-1 link" onClick={onTrace}>
            How was this priced?
          </Button>
          {grants.can('ledger:read') && (
            <Button variant="ghost" size="sm" className="!h-auto !px-1 link" onClick={onLedger}>
              Ledger entries
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
