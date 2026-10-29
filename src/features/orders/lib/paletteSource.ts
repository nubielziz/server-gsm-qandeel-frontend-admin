// The command palette's order search: type an ID, an IMEI or a buyer and get up to five orders, newest first, each opening
// its drawer on the Orders page. Ports the orders part of paletteItems(q) in 90-app.js; the server does the matching
// (`q` on `GET /admin/orders`) instead of the browser scanning every order.
import type { PaletteSource } from '@/app/palette';
import { listOrders } from '../api';
import { orderPath } from '../hooks/useOrderDrawer';
import { normalizeSearch } from './filters';
import { orderLabel } from './status';

/** Most orders the palette lists (the demo's limit). */
export const PALETTE_ORDER_LIMIT = 5;

export const ordersPaletteSource: PaletteSource = {
  id: 'orders',
  group: 'Orders',
  permission: 'orders:read',
  async search(query, signal, go) {
    const { data } = await listOrders(
      { q: normalizeSearch(query), start: 0, end: PALETTE_ORDER_LIMIT, sort: ['createdAt'], order: ['desc'] },
      { signal },
    );
    return data.map((order) => ({
      id: `order:${order.id}`,
      label: `${orderLabel(order)}  ${order.service.name}`,
      hint: order.customer?.name ?? order.client?.name,
      icon: 'orders' as const,
      run: () => go(orderPath(order.id)),
    }));
  },
};
