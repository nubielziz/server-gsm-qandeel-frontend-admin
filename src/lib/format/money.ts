// Money display, ported from the demo's 00-util.js (money, money0, price) and 13-b2c-ui.js (lm).
// The API sends money as 4-decimal strings; these helpers only format them, they never decide anything.
import type { Decimal, Money } from '../api/types';

/** Money as the API sends it (a string like "12.4900"), or a plain number. */
export type MoneyInput = Money | number;

/**
 * Converts money to a number for display-only maths (a chart axis, a bar width, a sign test).
 * The server owns real sums, balances and prices: never add or compare amounts here to decide anything.
 * A string that is not a number gives NaN, so bad data shows up instead of a silent zero.
 */
export function toAmount(value: MoneyInput): number {
  return typeof value === 'number' ? value : Number(value);
}

const formats = new Map<number, Intl.NumberFormat>();

/** An en-US formatter with a fixed number of decimals, built once per decimals count. */
function fixedFormat(decimals: number): Intl.NumberFormat {
  let format = formats.get(decimals);
  if (!format) {
    format = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formats.set(decimals, format);
  }
  return format;
}

/** US dollars with a thousands separator: `money(1234.5)` is "$1,234.50", `money(-3)` is "-$3.00". */
export function money(value: MoneyInput, decimals = 2): string {
  const n = toAmount(value);
  return (n < 0 ? '-' : '') + '$' + fixedFormat(decimals).format(Math.abs(n));
}

/** Whole dollars: "$1,235". */
export function money0(value: MoneyInput): string {
  return money(value, 0);
}

/** A unit price: three decimals under one dollar ("$0.125"), two otherwise. */
export function price(value: MoneyInput): string {
  return Math.abs(toAmount(value)) < 1 ? money(value, 3) : money(value, 2);
}

// Display symbols for the storefront currencies; any other code is shown as "CODE ".
const SYMBOLS: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  SEK: 'kr ',
  CAD: 'CA$',
  AED: 'AED ',
  SAR: 'SAR ',
};

/**
 * A USD amount shown in a customer's currency: `lm('10.0000', 'GBP', 0.79)` is "£7.90".
 * Pass the rate the order was priced with (its `fx`) or the currency's rate; the client keeps no rate table.
 */
export function lm(usd: MoneyInput, currency: string, rate: number | Decimal = 1): string {
  return (SYMBOLS[currency] ?? `${currency} `) + fixedFormat(2).format(toAmount(usd) * Number(rate));
}
