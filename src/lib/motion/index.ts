// The motion kit of the console: the enter animation, the hooks that play it on a change, and the sliding mark of tabs and links.
export {
  DURATION_BASE,
  DURATION_FAST,
  DURATION_SLOW,
  EASE_GLIDE,
  EASE_STANDARD,
  PAGE_RISE,
  TAB_SHIFT,
} from './tokens';
export { playEnter, prefersReducedMotion, type EnterOptions } from './enter';
export { tabDirection, tabShift } from './tabDirection';
export { useEnterOnChange, useTabEnter } from './useEnterOnChange';
export { LINK_INDICATOR, TAB_INDICATOR, attachIndicator, type IndicatorSpec } from './slidingIndicator';
export { useSlidingIndicator } from './useSlidingIndicator';
export { SlidingMark, type SlidingMarkProps } from './SlidingMark';
