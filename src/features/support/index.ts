// Public surface of the support feature: the `/admin/support-tickets*` and `/admin/reply-templates*` API functions, their types, the registry,
// the palette source, `CustomerTickets` (one customer's tickets, for the customer page's Support tab), the status badge and the links into the
// inbox (`supportListPath`, `supportTicketPath`). The page itself loads lazily from `./pages`.
export * from './api';
export * from './components/CustomerTickets';
export * from './components/TicketStatusBadge';
export { supportListPath, supportTicketPath, type SupportFilters, type TicketFilter } from './lib/filters';
export * from './lib/paletteSource';
export * from './types';
