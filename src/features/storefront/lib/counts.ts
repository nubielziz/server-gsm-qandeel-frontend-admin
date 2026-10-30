// The one count the page itself needs: the listings on the site, shown on the first tab. The listings tab's figures use the same
// spec and scope, so the two share one request.

/** Listings switched on, for the count on the "Services on sale" tab (the demo's `D(S.listings).filter(l => l.listed).length`). */
export const LISTED_SPEC = { id: 'listed', filters: { isListed: true } } as const;
