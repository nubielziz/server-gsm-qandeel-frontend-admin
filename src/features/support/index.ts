// Public surface of the support feature: the `/admin/support-tickets*` and `/admin/reply-templates*` API functions, their types, the registry,
// the palette source, `AccountTickets` (one account's tickets, for the Support part of an account's record), the status badge and the links into the
// inbox (`supportListPath`, `supportTicketPath`). The page itself loads lazily from `./pages`.
export * from './api';
export * from './components/AccountTickets';
export * from './components/TicketStatusBadge';
export { supportListPath, supportTicketPath, type SupportFilters, type TicketFilter } from './lib/filters';
export * from './lib/paletteSource';
export * from './types';
