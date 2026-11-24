// Public surface of the customers feature: the `/admin/customers*` and `/admin/data-requests*` API functions, their types, the data-provider registry,
// the palette source, and what other pages need to link to a customer: `customerPath`, `customersListPath` and the status badge.
// The pages themselves are not re-exported here: they load lazily from `./pages`.
export * from './api';
export * from './components/CustomerStatusBadge';
export { customerPath, type DetailTab } from './lib/detailTabs';
export { customersListPath, type CustomerFilters, type CustomerTab } from './lib/filters';
export * from './lib/paletteSource';
export * from './types';
