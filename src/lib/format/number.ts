// Number display and small numeric helpers, ported from the demo's 00-util.js.
// Inputs may also be decimal strings (`Decimal`) as the API sends them.

type NumberInput = number | string;

const plain = new Intl.NumberFormat('en-US');

/** Integer-style number with a thousands separator: "1,234,567". */
export function num(value: NumberInput): string {
  return plain.format(Number(value));
}

/** A percentage: one decimal by default and no trailing ".0" ("12.5%", "12%"). */
export function pct(value: NumberInput, decimals = 1): string {
  return Number(value).toFixed(decimals).replace(/\.0+$/, '') + '%';
}

/** Rounds to `decimals` places. */
export function round(value: NumberInput, decimals = 2): number {
  return Math.round(Number(value) * 10 ** decimals) / 10 ** decimals;
}

/** Short count for charts and tiles: 950, "1.2K", "15K", "3.4M". */
export function compact(value: NumberInput): string {
  const n = Number(value);
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return String(Math.round(n));
}

/** Sum of numbers, or of `pick(item)` for each item. For display only (see `toAmount`). */
export function sum(items: readonly number[]): number;
export function sum<T>(items: readonly T[], pick: (item: T) => number): number;
export function sum<T>(items: readonly T[], pick?: (item: T) => number): number {
  return items.reduce((total, item) => total + (pick ? pick(item) : Number(item)), 0);
}
