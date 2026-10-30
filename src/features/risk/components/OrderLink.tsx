// OrderLink: an order number that opens the order's drawer in place (`?order=<id>`, shown by the OrderDrawerHost the page
// mounts). Ports the demo's `orderLink`, a link-styled button. Risk orders are storefront orders, so the number reads SF-<id>.
import { orderLabel, useOrderDrawer } from '@/features/orders';

export function OrderLink({ id }: { id: number }) {
  const drawer = useOrderDrawer();
  return (
    <button type="button" className="link mono" onClick={() => drawer.open(id)}>
      {orderLabel({ id, channel: 'b2c' })}
    </button>
  );
}
