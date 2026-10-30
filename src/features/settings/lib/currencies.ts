// Display and form helpers for the currency table: the base currency, which rates are stale, the "Shown as" symbol and the checks the
// edit dialog makes before it asks the server. Ports tabTax's currencies and `staleCurrencies` (12-state-b2c.js). The server owns the rates.
import { lm } from '@/lib/format';
import type { Currency } from '../types';
import { isDecimalText } from './decimal';

/** Prices are set in this currency (the demo: "Prices are set in dollars"); it has no markup and no refresh. */
export const BASE_CURRENCY = 'USD';

/** A rate older than this is stale, the dashboard's rule ("Exchange rate is out of date"). */
export const STALE_AFTER_MS = 24 * 3_600_000;

/** Whether this is the base currency. */
export function isBaseCurrency(currency: Pick<Currency, 'code'>): boolean {
  return currency.code === BASE_CURRENCY;
}

/**
 * Whether the rate is out of date. The server's own call (`isStale`) wins when it sends one; otherwise the rate is stale after 24 hours,
 * or when it was never updated. The base currency has no rate to age.
 */
export function isStaleRate(currency: Currency, now: number): boolean {
  if (isBaseCurrency(currency)) return false;
  if (typeof currency.isStale === 'boolean') return currency.isStale;
  if (!currency.rateUpdatedAt) return true;
  return now - Date.parse(currency.rateUpdatedAt) > STALE_AFTER_MS;
}

/** The stale currencies, the dashboard's "fx_stale" list. */
export function staleCurrencies(currencies: readonly Currency[], now: number): Currency[] {
  return currencies.filter((currency) => isStaleRate(currency, now));
}

/** When the oldest of some currencies was updated, in milliseconds; `now` when none has a time. */
export function oldestUpdate(currencies: readonly Currency[], now: number): number {
  const times = currencies
    .map((currency) => Date.parse(currency.rateUpdatedAt ?? ''))
    .filter((ms) => !Number.isNaN(ms));
  return times.length > 0 ? Math.min(...times) : now;
}

/** The symbol customers see: "£" for GBP, "kr" for SEK, the code itself when there is no symbol. */
export function shownAs(code: string): string {
  return lm(0, code)
    .replace(/0\.00$/, '')
    .trim();
}

/** The markup the demo accepts: 0 to 10 percent. A hint; the server decides. Returns the message, or null when the text is fine. */
export function markupProblem(text: string): string | null {
  const value = text.trim();
  return isDecimalText(value) && Number(value) <= 10 ? null : 'Enter a markup between 0 and 10.';
}

/** The rate must be a number above zero. Returns the message, or null when the text is fine. */
export function rateProblem(text: string): string | null {
  const value = text.trim();
  return isDecimalText(value) && Number(value) > 0 ? null : 'Enter a rate above zero.';
}
