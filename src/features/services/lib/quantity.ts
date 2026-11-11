// The quantity block of the New/Edit service dialog (feature 25): the three ways a service can sell (one per order, a range, fixed
// packs), the checks the dialog runs before it calls the server (same words as the server where it has them), and the part of the
// body that carries the rule. The server stays the authority; these are hints.
import type { QuantityRule } from '@/lib/format';
import type { CreateServiceBody } from '../types';

/** The largest quantity (and pack size) the API takes. */
export const MAX_QUANTITY = 100_000;
/** The most pack sizes one service can list. */
export const MAX_PACKS = 50;

/** One per order, a range between a smallest and a largest quantity, or fixed pack sizes. */
export type QuantityMode = 'single' | 'range' | 'packs';

/** The dialog's quantity inputs, as text. `qtyOptions` is the pack sizes typed by hand. */
export type QuantityValues = {
  quantityMode: QuantityMode;
  minQty: string;
  maxQty: string;
  qtyOptions: string;
};

/** The part of a create or change body that carries the rule. */
export type QuantityBody = Pick<CreateServiceBody, 'minQty' | 'maxQty' | 'qtyOptions'>;

const WHOLE = /^\d+$/;

/** Which way a service sells: packs when it lists any, one per order when it is 1 to 1, else a range. */
export function modeOf(rule: QuantityRule): QuantityMode {
  if (rule.qtyOptions.length > 0) return 'packs';
  return rule.minQty === 1 && rule.maxQty === 1 ? 'single' : 'range';
}

/** What the inputs start with: a new service sells one per order; an existing one starts in the way it sells now. */
export function quantityDefaults(rule?: QuantityRule): QuantityValues {
  if (!rule) return { quantityMode: 'single', minQty: '1', maxQty: '', qtyOptions: '' };
  const mode = modeOf(rule);
  return {
    quantityMode: mode,
    minQty: mode === 'range' ? String(rule.minQty) : '1',
    maxQty: mode === 'range' ? String(rule.maxQty) : '',
    qtyOptions: rule.qtyOptions.join(', '),
  };
}

/** A whole number from 1 to 100000 typed in a box, or null. */
function wholeOf(text: string): number | null {
  const trimmed = text.trim();
  if (!WHOLE.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= 1 && value <= MAX_QUANTITY ? value : null;
}

/** The pack sizes typed in the box, ascending, or the sentence that says what is wrong with them. */
export function parsePacks(text: string): { packs: number[] } | { message: string } {
  const tokens = text.split(/[\s,;]+/).filter((token) => token !== '');
  if (tokens.length === 0) return { message: 'Enter at least one pack size.' };
  // The server counts the packs before it reads them, so too many comes first here too.
  if (tokens.length > MAX_PACKS) return { message: `Use at most ${MAX_PACKS} pack sizes.` };
  const packs: number[] = [];
  for (const token of tokens) {
    const value = wholeOf(token);
    if (value === null) {
      return { message: `Pack sizes are whole numbers from 1 to ${MAX_QUANTITY}; ${token} is not.` };
    }
    if (packs.includes(value)) return { message: `The pack size ${value} is repeated.` };
    packs.push(value);
  }
  return { packs: packs.sort((a, b) => a - b) };
}

/** The message under "Smallest" in the range way, or true when it is fine (or the other ways are chosen). */
export function minProblem(values: QuantityValues): string | true {
  if (values.quantityMode !== 'range') return true;
  return wholeOf(values.minQty) === null ? `Enter a whole number from 1 to ${MAX_QUANTITY}.` : true;
}

/** The message under "Largest" in the range way, or true when it is fine (or the other ways are chosen). */
export function maxProblem(values: QuantityValues): string | true {
  if (values.quantityMode !== 'range') return true;
  const max = wholeOf(values.maxQty);
  if (max === null) return `Enter a whole number from 1 to ${MAX_QUANTITY}.`;
  const min = wholeOf(values.minQty);
  if (min !== null && max < min) return `The largest quantity cannot be below the smallest (${min}).`;
  return true;
}

/** The message under "Pack sizes" in the packs way, or true when it is fine (or the other ways are chosen). */
export function packsProblem(values: QuantityValues): string | true {
  if (values.quantityMode !== 'packs') return true;
  const parsed = parsePacks(values.qtyOptions);
  return 'message' in parsed ? parsed.message : true;
}

/** The rule the inputs mean, or null while they hold a problem. The server derives the same for packs. */
export function ruleOf(values: QuantityValues): QuantityRule | null {
  if (values.quantityMode === 'single') return { minQty: 1, maxQty: 1, qtyOptions: [] };
  if (values.quantityMode === 'range') {
    const min = wholeOf(values.minQty);
    const max = wholeOf(values.maxQty);
    return min !== null && max !== null && max >= min ? { minQty: min, maxQty: max, qtyOptions: [] } : null;
  }
  const parsed = parsePacks(values.qtyOptions);
  if ('message' in parsed) return null;
  const { packs } = parsed;
  return { minQty: packs[0] ?? 1, maxQty: packs[packs.length - 1] ?? 1, qtyOptions: packs };
}

const sameRule = (a: QuantityRule, b: QuantityRule): boolean =>
  a.minQty === b.minQty &&
  a.maxQty === b.maxQty &&
  a.qtyOptions.length === b.qtyOptions.length &&
  a.qtyOptions.every((value, index) => value === b.qtyOptions[index]);

/**
 * The quantity keys to send. A new service sends none for one per order, `minQty` and `maxQty` for a range and `qtyOptions` for
 * packs. An edit sends them only when the rule differs from the service's: one per order and a range send all three (so packs
 * are cleared), packs send `qtyOptions` alone because the server derives the smallest and largest.
 */
export function quantityBody(values: QuantityValues, current?: QuantityRule): QuantityBody {
  const rule = ruleOf(values);
  if (!rule) return {};
  if (!current) {
    if (values.quantityMode === 'single') return {};
    return values.quantityMode === 'range'
      ? { minQty: rule.minQty, maxQty: rule.maxQty }
      : { qtyOptions: [...rule.qtyOptions] };
  }
  if (sameRule(rule, current)) return {};
  return values.quantityMode === 'packs'
    ? { qtyOptions: [...rule.qtyOptions] }
    : { minQty: rule.minQty, maxQty: rule.maxQty, qtyOptions: [] };
}
