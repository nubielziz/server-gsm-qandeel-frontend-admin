// Public surface of the orders feature: the `/admin/orders*` and `/admin/files/:id` API functions, their types, the data-provider
// registry, the palette source and what other pages need to show orders: `OrdersTable` (a list with fixed filters, for a merchant's
// or customer's page), `OrderDrawerHost` with `useOrderDrawer` / `orderPath` (the drawer in the address as `?order=<id>`) and
// `OrderStatusBadge`, and `ordersListPath` for links to a filtered list. The page itself is not re-exported here: it
// loads lazily from `./pages`.
export * from './api';
export * from './components/OrderDrawerHost';
export * from './components/OrdersTable';
export * from './components/OrderStatusBadge';
export * from './hooks/useOrder';
export * from './hooks/useOrderDrawer';
export * from './hooks/useOrdersList';
export {
  displayStatus,
  isOpen,
  orderLabel,
  STATUS_BADGE,
  TYPE_LABEL,
  type DisplayStatus,
} from './lib/status';
export { ordersListPath, type OrderFilters } from './lib/filters';
export * from './lib/paletteSource';
export * from './types';
