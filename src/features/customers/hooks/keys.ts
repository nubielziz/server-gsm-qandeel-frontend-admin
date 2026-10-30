// Query keys of the customer reads that are not Refine resources (decision 005: they start with `['api', <feature>]`). A
// mutation lists the keys it makes stale; React Query matches them as prefixes.

/** The tab counts, the "have an account" figure and the open-requests count. */
export const CUSTOMER_COUNTS_KEY = ['api', 'customers', 'counts'] as const;
