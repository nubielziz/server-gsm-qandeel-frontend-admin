// Reads what staff type into a money or percent box (adjust wallet, credit limit, override and group dialogs) and gives the
// API its text form. Plain text parsing, no float maths: the server owns every amount, the console only avoids sending nonsense.
import type { Decimal, Money } from '@/lib/api';

// "1250", "1,250", "1250.5" or "$1,250.0000": a whole part (digits, or digits grouped by thousands commas) and up to four decimals.
const AMOUNT = /^(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,4}))?$/;

/**
 * The API's money text ("25.5" becomes "25.5000") for what was typed, or null when it is not an amount. A dollar sign and
 * thousands commas are allowed. Zero is refused unless `allowZero` (a credit limit of 0 removes the credit); a comma used
 * as a decimal mark ("25,50") is refused instead of being read as 2550.
 */
export function parseAmount(text: string, options: { allowZero?: boolean } = {}): Money | null {
  const match = AMOUNT.exec(text.trim().replace(/^\$\s*/, ''));
  if (!match) return null;
  const whole = match[1].replaceAll(',', '').replace(/^0+(?=\d)/, '');
  const money = `${whole}.${(match[2] ?? '').padEnd(4, '0')}`;
  return options.allowZero || /[1-9]/.test(money) ? money : null;
}

/** Money text as a person would type it back into a box: "2000.0000" is "2000.00", "0.1250" is "0.125". */
export function amountInput(value: Money): string {
  const [whole, fraction = ''] = value.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  return `${whole}.${trimmed.padEnd(2, '0')}`;
}

const PERCENT = /^(\d{1,3})(?:\.(\d{1,2}))?$/;

/** A percent between 0 and 100 with up to two decimals ("4", "2.5%"), as the API's decimal text, or null. */
export function parsePercent(text: string): Decimal | null {
  const match = PERCENT.exec(text.trim().replace(/\s*%$/, ''));
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = (match[2] ?? '').replace(/0+$/, '');
  if (whole > 100 || (whole === 100 && fraction !== '')) return null;
  return fraction ? `${whole}.${fraction}` : String(whole);
}
