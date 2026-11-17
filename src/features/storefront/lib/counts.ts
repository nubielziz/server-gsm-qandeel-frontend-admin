// The counts the page itself needs: the listings on the site, shown on the first tab, and the price changes that wait, on the Retail pricing tab. The listings tab's figures use the same
// spec and scope, so the two share one request.

/** Listings switched on, for the count on the "Services on sale" tab (the demo's `D(S.listings).filter(l => l.listed).length`). */
export const LISTED_SPEC = { id: 'listed', filters: { isListed: true } } as const;

/**
 * Price changes that wait for a person, for the chip on the "Retail pricing" tab (a list call with `waiting=true`, read from
 * `x-total-count`). The tab itself shows the same list; both share this request.
 */
export const WAITING_SPEC = { id: 'waiting', filters: { waiting: true } } as const;
