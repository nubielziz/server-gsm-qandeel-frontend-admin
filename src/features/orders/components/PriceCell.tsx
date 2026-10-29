// PriceCell: the Price column. Ports the render of orderCols in 41-p-orders.js: the price, and for a storefront order what
// the customer paid in their own currency.
import { lm, money } from '@/lib/format';
import { orderFx, orderGross } from '../lib/money';
import type { Order } from '../types';

export function PriceCell({ order }: { order: Order }) {
  return (
    <>
      {money(order.totalPrice)}
      {order.channel === 'b2c' && (
        <p className="text-2xs text-ink3">paid {lm(orderGross(order), order.currency, orderFx(order))}</p>
      )}
    </>
  );
}
