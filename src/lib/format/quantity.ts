// The text for a service's quantity rule, shared by the services table and the supplier import preview (feature 25).

/** The three values that make a service's quantity rule, as the API sends them. */
export type QuantityRule = { minQty: number; maxQty: number; qtyOptions: readonly number[] };

/** How many pack sizes the short text lists before it counts the rest. */
const PACKS_SHOWN = 5;

/**
 * A short text for a quantity rule: `1` for one per order, `5` for a fixed quantity, `1–50` for a range and
 * `Packs 5, 10, 25` for fixed packs (more than five: the first five, then ` +N`).
 */
export function quantityText(rule: QuantityRule): string {
  if (rule.qtyOptions.length > 0) {
    const shown = rule.qtyOptions.slice(0, PACKS_SHOWN).join(', ');
    const more = rule.qtyOptions.length - PACKS_SHOWN;
    return `Packs ${shown}${more > 0 ? ` +${more}` : ''}`;
  }
  return rule.minQty === rule.maxQty ? String(rule.minQty) : `${rule.minQty}–${rule.maxQty}`;
}
