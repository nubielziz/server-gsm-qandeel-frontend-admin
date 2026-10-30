// Money and decimal text for the forms. They only reshape text: an amount from the API goes into an input, and what was
// typed goes back as the API's money text. No amount is added, compared or rounded here (the server owns every price).
import type { Decimal, Money } from '@/lib/api';

const MONEY_TEXT = /^\d+(\.\d{1,4})?$/;
const SIGNED_TEXT = /^-?\d+(\.\d{1,4})?$/;

/**
 * An API amount for an input: at least two decimals and no trailing zeros beyond them (`"13.5000"` shows `13.50`,
 * `"0.1250"` shows `0.125`), so a price with more than two decimals is never cut by the box.
 */
export function moneyInput(value: Money | Decimal): string {
  const [whole, fraction = ''] = value.trim().split('.');
  return `${whole}.${fraction.replace(/0+$/, '').padEnd(2, '0')}`;
}

/** True for a plain amount of up to four decimals: `12`, `12.5`, `0.0125`. A hint for the form; the server decides. */
export function isMoneyText(text: string): boolean {
  return MONEY_TEXT.test(text.trim());
}

/** True for an amount that may start with a minus sign: `-0.25`, `5`. */
export function isSignedText(text: string): boolean {
  return SIGNED_TEXT.test(text.trim());
}

/** Typed amount as the API's four-decimal text: `"12.5"` becomes `"12.5000"`. Pads text; it does no arithmetic. */
export function toMoneyText(text: string): Money {
  const [whole, fraction = ''] = text.trim().split('.');
  return `${whole}.${fraction.padEnd(4, '0')}`;
}

/** Whether two amounts are the same number written two ways (`"13.50"` and `"13.5000"`). */
export function sameMoney(a: string, b: string): boolean {
  return toMoneyText(a) === toMoneyText(b);
}

/** A percentage from the API without trailing zeros: `"2.0000"` is `2%`, `"0.2500"` is `0.25%`. */
export function percentText(value: Decimal): string {
  return `${Number(value)}%`;
}
