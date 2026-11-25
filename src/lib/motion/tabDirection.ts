// Which way the content under a tab comes in: from the side of the tab that was clicked. Pure, so each rule is a test row.
import { TAB_SHIFT } from './tokens';

/**
 * +1 when the new tab is further along the strip than the old one (the content comes from the end side), -1 when it is
 * nearer the start, and 0 when either value is not in `order` (the content then only fades) or nothing changed.
 */
export function tabDirection(from: string, to: string, order: readonly string[]): -1 | 0 | 1 {
  const before = order.indexOf(from);
  const after = order.indexOf(to);
  if (before < 0 || after < 0 || before === after) return 0;
  return after > before ? 1 : -1;
}

/** The sideways start of an enter in px: the console reads from left to right, so "the end side" is positive. */
export function tabShift(from: string, to: string, order: readonly string[]): number {
  return tabDirection(from, to, order) * TAB_SHIFT;
}
