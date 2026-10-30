// Money text for the price form. It only reshapes text: an amount from the API goes into an input, and what was typed goes
// back as the API's money text. No amount is added, compared or rounded here (the server owns every price).
import type { Money } from '@/lib/api';

const MONEY_TEXT = /^\d+(\.\d{1,4})?$/;

/** An API amount for an input: at least two decimals and no trailing zeros beyond them (`"3.9900"` shows `3.99`). */
export function moneyInput(value: Money): string {
  const [whole, fraction = ''] = value.trim().split('.');
  return `${whole}.${fraction.replace(/0+$/, '').padEnd(2, '0')}`;
}

/** True for a plain amount of up to four decimals: `12`, `12.5`, `0.0125`. A hint for the form; the server decides. */
export function isMoneyText(text: string): boolean {
  return MONEY_TEXT.test(text.trim());
}

/** A typed amount as the API's four-decimal text: `"12.5"` becomes `"12.5000"`. Pads text; it does no arithmetic. */
export function toMoneyText(text: string): Money {
  const [whole, fraction = ''] = text.trim().split('.');
  return `${whole}.${fraction.padEnd(4, '0')}`;
}

/** Whether two amounts are the same number written two ways (`"3.99"` and `"3.9900"`). */
export function sameMoney(a: string, b: string): boolean {
  return toMoneyText(a) === toMoneyText(b);
}
