// Query keys of the customer reads that are not Refine resources (decision 005: they start with `['api', <feature>]`). A
// mutation lists the keys it makes stale; React Query matches them as prefixes.

/** The tab counts, the "have an account" figure and the open-requests count. */
export const CUSTOMER_COUNTS_KEY = ['api', 'customers', 'counts'] as const;

/**
 * The store balance of each customer. The finance feature invalidates the same prefix when a customer's top-up is approved
 * (it cannot import this file: customers already imports finance), so keep the two in step.
 */
export const CUSTOMER_WALLET_KEY = ['api', 'customers', 'wallet'] as const;

/** The statement rows of each customer's balance (every page, sort and date range). */
export const CUSTOMER_STATEMENT_KEY = ['api', 'customers', 'wallet-statement'] as const;

/** The journal entries behind the statement's "View journal" button. */
export const CUSTOMER_JOURNAL_KEY = ['api', 'customers', 'wallet-journal'] as const;
