// Query keys of the checkouts reads (decision 005: they start with `['api', <feature>]`) and how often the list asks again. React
// Query matches keys as prefixes, so one key refreshes every page and filter of the list.

/** The abandoned checkouts list. */
export const CHECKOUTS_KEY = ['api', 'checkouts', 'abandoned'] as const;

/** The funnel report, one entry per period. */
export const FUNNEL_KEY = ['api', 'checkouts', 'funnel'] as const;

/** How often the list asks again while the page is open: people keep leaving checkouts, and the automatic reminder goes out by itself. */
export const REFRESH_MS = 60_000;
