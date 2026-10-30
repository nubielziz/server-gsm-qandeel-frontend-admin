// How one step of the price resolution is drawn, as the demo's resolver drew it: its icon, colour and word, and the figure on the
// right. The server resolves the price (`GET /admin/pricing/resolve`); this only formats what it sent (display maths).
import type { IconName } from '@/components/ui';
import { money, pct, toAmount } from '@/lib/format';
import type { PriceSource, PriceStep, StepState } from '../types';

/** The icon, colour and word of each step state (the demo's `stepIcon`). */
export const STEP_LOOK: Record<StepState, { icon: IconName; tone: string; word: string }> = {
  win: { icon: 'checkCircle', tone: 'text-good-fg', word: 'Used' },
  apply: { icon: 'checkCircle', tone: 'text-good-fg', word: 'Applied' },
  skip: { icon: 'ban', tone: 'text-ink3', word: 'Skipped' },
  none: { icon: 'more', tone: 'text-ink3', word: 'Not set' },
};

/** The price source in the words of the demo's summary line. */
export const SOURCE_WORDS: Record<PriceSource, string> = {
  base: 'base price',
  group: 'group price',
  client: 'client override',
};

/** A step's number, or null when it has none. Decimal text from the API is read as a number for display only. */
function amountOf(value: number | string | null): number | null {
  if (value === null || value === '') return null;
  const amount = toAmount(value);
  return Number.isFinite(amount) ? amount : null;
}

/** Steps that decided or changed the price carry the tint; skipped and unset steps recede. */
export const isLive = (step: PriceStep): boolean => step.state === 'win' || step.state === 'apply';

/**
 * The figure on the right of a step (the demo's `valueOf`): a price, or a signed percentage for the category rule and the
 * group discount. A skipped step shows nothing, except the base price, which is struck through by the caller.
 */
export function stepValueText(step: PriceStep): string {
  const value = amountOf(step.value);
  if (value === null) return '';
  if (step.state === 'skip' && step.id !== 'base') return '';
  if (step.id === 'category') return value ? `${value > 0 ? '+' : '−'}${pct(Math.abs(value) * 100, 0)}` : '';
  if (step.id === 'discount') return value ? `−${pct(value * 100, 0)}` : '';
  return money(value);
}

/** The "= $X" line under a live step: the running price, shown only when the step changed it. */
export function stepAfterText(step: PriceStep): string | null {
  const after = amountOf(step.after);
  if (after === null || !isLive(step)) return null;
  const value = amountOf(step.value);
  if (
    value !== null &&
    step.id !== 'category' &&
    step.id !== 'discount' &&
    Math.abs(value - after) <= 0.004
  ) {
    return null;
  }
  return `= ${money(after)}`;
}
