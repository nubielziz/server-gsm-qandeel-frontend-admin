// Reads what staff type into a money box (the wallet adjustment and the credit limit) and gives the API its four-decimal text, and writes
// money back the way a person types it. Plain text handling, no float maths: the server owns every amount; the console only avoids nonsense.
import type { Money } from '@/lib/api';

// "1250", "1,250", "1250.5" or "$1,250.0000": a whole part (digits, or digits grouped by thousands commas) and up to four decimals.
const AMOUNT = /^(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,4}))?$/;

/**
 * The API's money text ("25.5" becomes "25.5000") for what was typed, or null when it is not an amount. A dollar sign and thousands
 * commas are allowed. Zero is refused unless `allowZero` (a credit limit of 0 removes the credit); a comma used as a decimal mark
 * ("25,50") is refused instead of being read as 2550.
 *
 * @param text what the box holds.
 * @param options `allowZero`: accept 0 (a credit limit).
 * @returns the four-decimal text, or null.
 */
export function parseAmount(text: string, options: { allowZero?: boolean } = {}): Money | null {
  const match = AMOUNT.exec(text.trim().replace(/^\$\s*/, ''));
  if (!match) return null;
  const whole = match[1].replaceAll(',', '').replace(/^0+(?=\d)/, '');
  const amount = `${whole}.${(match[2] ?? '').padEnd(4, '0')}`;
  return options.allowZero || /[1-9]/.test(amount) ? amount : null;
}

/**
 * Money text as a person would type it back into a box: "2000.0000" is "2000.00", "0.1250" is "0.125".
 *
 * @param value money as the API sends it.
 * @returns the text for a box.
 */
export function amountInput(value: Money): string {
  const [whole, fraction = ''] = value.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  return `${whole}.${trimmed.padEnd(2, '0')}`;
}
