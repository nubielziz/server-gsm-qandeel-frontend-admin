// BuyerCell: the Buyer column. Ports buyerCell of 13-b2c-ui.js: a merchant with the way the order arrived, or a
// storefront customer with a masked email.
import { TypeTag } from '@/components/ui';
import { maskEmail } from '@/lib/format';
import { sourceLabel } from '../lib/status';
import type { Order } from '../types';

export function BuyerCell({ order }: { order: Order }) {
  if (order.channel === 'b2c') {
    return (
      <>
        <span className="block max-w-[170px] truncate">{order.customer?.name ?? '–'}</span>
        <span className="block max-w-[170px] truncate text-2xs text-ink3">
          <TypeTag className="me-1">Storefront</TypeTag>
          {order.customer ? maskEmail(order.customer.email) : ''}
        </span>
      </>
    );
  }
  return (
    <>
      <span className="block max-w-[170px] truncate">{order.client?.name ?? '–'}</span>
      <span className="mono text-2xs text-ink3">{sourceLabel(order.source)}</span>
    </>
  );
}
