// Display and form helpers for the currency table: the base currency, which rates are stale, the "Shown as" symbol and the checks the
// edit dialog makes before it asks the server, and the ISO 4217 menu of the Add currency form with the name and decimals that follow from
// a code (decision 036). Ports tabTax's currencies and `staleCurrencies` (12-state-b2c.js). The server owns the rates.
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

/** The codes offered when the browser cannot list the ISO 4217 currencies: the ones a shop of this kind is likely to price in. */
export const FALLBACK_CURRENCY_CODES: readonly string[] = [
  'AED',
  'AUD',
  'BHD',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'DKK',
  'EGP',
  'EUR',
  'GBP',
  'HKD',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'IQD',
  'JOD',
  'JPY',
  'KRW',
  'KWD',
  'LBP',
  'MAD',
  'MXN',
  'MYR',
  'NOK',
  'NZD',
  'OMR',
  'PKR',
  'PLN',
  'QAR',
  'RON',
  'RUB',
  'SAR',
  'SEK',
  'SGD',
  'THB',
  'TND',
  'TRY',
  'UAH',
  'USD',
  'ZAR',
];

/** The server's range for the decimals a price shows. */
const MAX_DECIMALS = 4;

/** The ISO 4217 codes the browser knows (`Intl.supportedValuesOf`), or the small built-in list when it cannot say. Sorted. */
export function isoCurrencyCodes(): string[] {
  const known = browserCurrencyCodes();
  const list = known.length > 0 ? known : FALLBACK_CURRENCY_CODES;
  return [...list].map((code) => code.toUpperCase()).sort();
}

/** What the browser lists as ISO 4217 currencies; nothing when it cannot say (an old browser) or refuses. */
function browserCurrencyCodes(): readonly string[] {
  try {
    return typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : [];
  } catch {
    return [];
  }
}

/** The English name of a currency (`Intl.DisplayNames`), the code itself when the browser has none. */
export function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'currency' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** The decimals a price in this currency shows (`Intl.NumberFormat`: 0 for JPY, 3 for KWD), kept inside the server's 0 to 4; 2 when unknown. */
export function currencyDecimals(code: string): number {
  try {
    const { maximumFractionDigits } = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code.toUpperCase(),
    }).resolvedOptions();
    return Math.min(MAX_DECIMALS, Math.max(0, maximumFractionDigits ?? 2));
  } catch {
    return 2;
  }
}

/** The menu of the Add currency form: "CODE - Name", without the codes already in the list, and with a first line that asks for a choice. */
export function currencyOptions(taken: readonly string[]): { value: string; label: string }[] {
  const used = new Set(taken.map((code) => code.toUpperCase()));
  return [
    { value: '', label: 'Choose a currency…' },
    ...isoCurrencyCodes()
      .filter((code) => !used.has(code))
      .map((code) => ({ value: code, label: `${code} - ${currencyName(code)}` })),
  ];
}

/**
 * True when a currency being edited holds a name or decimals that are not what its code gives, so the "More options" fold starts open
 * and a value set by hand is not out of sight.
 */
export function hasCustomCurrencyFacts(currency: Pick<Currency, 'code' | 'name' | 'decimals'>): boolean {
  return (
    currency.name !== currencyName(currency.code) || currency.decimals !== currencyDecimals(currency.code)
  );
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
