// Input helpers for the fixed-price dialogs: reading what staff type into the price box and giving the API its text form. Plain text
// parsing, no float maths: the server owns every amount and checks the floor, the console only avoids sending nonsense.
import type { Money } from '@/lib/api';

/** The most characters a note may have. */
export const NOTE_MAX = 140;

// "12", "1,250", "0.5" or "$1,250.0000": a whole part (digits, or digits grouped by thousands commas) and up to four decimals.
const AMOUNT = /^(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,4}))?$/;

/**
 * The API's money text ("15" becomes "15.0000") for what was typed, or null when it is not a price above zero. A dollar sign and
 * thousands commas are allowed; a comma used as a decimal mark ("25,50") is refused instead of being read as 2550.
 */
export function parsePrice(text: string): Money | null {
  const match = AMOUNT.exec(text.trim().replace(/^\$\s*/, ''));
  if (!match) return null;
  const whole = match[1].replaceAll(',', '').replace(/^0+(?=\d)/, '');
  const money = `${whole}.${(match[2] ?? '').padEnd(4, '0')}`;
  return /[1-9]/.test(money) ? money : null;
}

/** Money text as a person would type it back into the box: "0.1000" is "0.10", "0.1250" is "0.125". */
export function priceInput(value: Money): string {
  const [whole, fraction = ''] = value.split('.');
  return `${whole}.${fraction.replace(/0+$/, '').padEnd(2, '0')}`;
}

/** True when two money texts are the same amount ("0.1" and "0.1000"), compared as text so no float is involved. */
export function samePrice(a: Money, b: Money): boolean {
  const split = (value: Money) => {
    const [whole = '', fraction = ''] = value.trim().split('.');
    return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.replace(/0+$/, '')}`;
  };
  return split(a) === split(b);
}

/** A note as sent: trimmed. */
export function cleanNote(text: string): string {
  return text.trim();
}
