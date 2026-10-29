// Display-only money maths for the order screens: profit, what a storefront customer paid, what is at stake in a
// selection. The server owns every real sum, price and balance (CLAUDE.md); these figures only fill a column or a
// sentence, and nothing is decided from them except the red colour of a negative profit.
import { sum, toAmount } from '@/lib/format';
import type { Order } from '../types';
import { isOpen } from './status';

/** Price minus supplier cost. The gateway fee of a storefront order is not on the order, so it is not taken off. */
export function orderProfit(order: Pick<Order, 'totalPrice' | 'totalCost'>): number {
  return toAmount(order.totalPrice) - toAmount(order.totalCost);
}

/** What the buyer paid: the price plus VAT. For a merchant order VAT is zero, so this is the price. */
export function orderGross(order: Pick<Order, 'totalPrice' | 'taxAmount'>): number {
  return toAmount(order.totalPrice) + toAmount(order.taxAmount);
}

/** The rate a storefront order was priced at (`pricingSnapshot.fx`), or 1 when the snapshot has none. */
export function orderFx(order: Pick<Order, 'pricingSnapshot'>): number {
  const fx = Number(order.pricingSnapshot?.fx);
  return Number.isFinite(fx) && fx > 0 ? fx : 1;
}

/** The VAT rate in percent (`pricingSnapshot.taxRate` is a fraction such as 0.2), or 0 when there is none. */
export function orderTaxRate(order: Pick<Order, 'pricingSnapshot'>): number {
  const rate = Number(order.pricingSnapshot?.taxRate);
  return Number.isFinite(rate) && rate > 0 ? rate * 100 : 0;
}

/** The sum the open orders of a selection hold (the bulk bar's "at stake"). */
export function atStake(orders: readonly Pick<Order, 'status' | 'totalPrice'>[]): number {
  return sum(orders.filter(isOpen), (order) => toAmount(order.totalPrice));
}
