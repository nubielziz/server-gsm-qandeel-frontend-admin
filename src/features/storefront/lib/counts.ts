// The counts the storefront screens need: the price changes that wait (the shop price rules) and the shop price rules that are switched on
// (the publish start's note).

/**
 * Price changes that wait for a person, for the chip on the "Retail pricing" tab (a list call with `waiting=true`, read from
 * `x-total-count`). The tab itself shows the same list; both share this request.
 */
export const WAITING_SPEC = { id: 'waiting', filters: { waiting: true } } as const;

/** The retail pricing rules that are switched on, for the Publish tab's note: none means no row can get a price from a rule. */
export const ACTIVE_RULES_SPEC = { id: 'activeRules', filters: { isActive: true } } as const;
