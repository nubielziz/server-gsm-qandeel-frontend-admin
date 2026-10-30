// Public surface of the checkouts feature: the `/admin/checkouts/*` and `/admin/reports/funnel` API functions, their types, and
// `checkoutsListPath` for links to the page. The page itself is not re-exported here: it loads lazily from `./pages`.
export * from './api';
export { checkoutsListPath, type CheckoutFilter, type CheckoutFilters } from './lib/filters';
export * from './types';
