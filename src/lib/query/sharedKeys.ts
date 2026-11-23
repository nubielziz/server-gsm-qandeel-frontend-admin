// Query keys more than one feature reads or makes stale. Keys owned by one feature stay in that feature.

/**
 * `GET /admin/dashboard`: the dashboard page and the sidebar counts read it. An action that changes a count (an order
 * completed, a deposit approved, a ticket answered) invalidates this key, so the counts update at once instead of at
 * the next minute's refresh.
 */
export const DASHBOARD_KEY = ['api', 'dashboard'] as const;

/**
 * A merchant's wallet figures (the merchants feature reads them). An action that moves money into or out of a wallet
 * elsewhere (a deposit approved on the Finance page) invalidates this key.
 */
export const MERCHANT_WALLET_KEY = ['api', 'merchants', 'wallet'] as const;

/**
 * Every read that shows the services' rows or the facts printed on them: the services lists (All, the price grid) and the shop,
 * price and supplier-link facts of a row. A change that moves one of those facts elsewhere (a listing switched, a publish
 * run applied, a retail rule or a proposed shop price decided, a supplier link saved) invalidates this key together with the
 * `services` resource. A read that belongs here puts the key first: `[...SERVICE_ROWS_KEY, 'counts', filters]`, because
 * React Query matches keys as prefixes. This file only defines the key; each mutation adds it where it already invalidates.
 */
export const SERVICE_ROWS_KEY = ['api', 'services', 'rows'] as const;

/**
 * The start of every key of the listing read (`['api', 'storefront', 'listing', id]`) that the shop parts of the service editor hold open: it
 * is kept for good, so only a write makes it old. A listing write, a decided shop price proposal, a retail rule and every price
 * change on the services side (the merchant price, the group prices, a bulk change, a merchant price rule: the listing prints the
 * service's base price and the shop floor) invalidate it. The storefront's `useListing` re-exports it.
 */
export const LISTING_DETAILS_KEY = ['api', 'storefront', 'listing'] as const;
