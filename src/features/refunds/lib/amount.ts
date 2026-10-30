// Exact handling of the amount a person types in the approve dialog. Money is a 4-decimal string; these helpers read and
// compare it as whole units of 1/10000, so no float maths touches an amount that is sent to the server.
import type { Money } from '@/lib/api';

const SCALE = 4;

/**
 * Reads a typed amount: "7.5" is "7.5000". Plain digits with an optional dot and at most four decimals are accepted
 * (a leading "$" is dropped); anything else gives null. The text is never turned into a float.
 */
export function parseAmount(text: string): Money | null {
  const match = /^(\d+)(?:\.(\d{1,4}))?$/.exec(text.trim().replace(/^\$/, ''));
  if (!match) return null;
  const whole = match[1].replace(/^0+(?=\d)/, '');
  return `${whole}.${(match[2] ?? '').padEnd(SCALE, '0')}`;
}

// Money as a whole number of 1/10000 units. A value with fewer or more decimals is padded or cut, so "5" and "5.0000" agree.
function toUnits(amount: Money): bigint {
  const [whole = '0', fraction = ''] = amount.trim().split('.');
  return BigInt(`${whole}${fraction.padEnd(SCALE, '0').slice(0, SCALE)}`);
}

/** Orders two amounts exactly: -1, 0 or 1. */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  const left = toUnits(a);
  const right = toUnits(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

/** True when the amount is above zero. */
export function isPositive(amount: Money): boolean {
  return compareMoney(amount, '0') > 0;
}

/**
 * The amount as a person edits it: at least two decimals, and the extra zeros of the 4-decimal form dropped
 * ("19.9900" is "19.99", "19.9950" stays "19.995").
 */
export function editableAmount(amount: Money): string {
  const [whole = '0', fraction = ''] = amount.trim().split('.');
  return `${whole}.${fraction.replace(/0+$/, '').padEnd(2, '0')}`;
}
