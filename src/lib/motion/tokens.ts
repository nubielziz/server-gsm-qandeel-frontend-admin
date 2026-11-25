// The motion tokens as numbers and strings, for code that animates with the Web Animations API (src/lib/motion).
// They mirror the "Motion tokens" block of src/styles/index.css (--ease-standard, --ease-glide, --duration-fast,
// --duration-base, --duration-slow): change a value in both places together.

/** A small, quick change (--duration-fast), in ms. */
export const DURATION_FAST = 120;
/** The usual length of an enter (--duration-base), in ms. */
export const DURATION_BASE = 200;
/** Things that travel, like the sliding marks (--duration-slow), in ms. */
export const DURATION_SLOW = 300;

/** --ease-standard. */
export const EASE_STANDARD = 'cubic-bezier(0.2, 0, 0, 1)';
/** --ease-glide: a long, soft ease-out. */
export const EASE_GLIDE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** How far a new page rises while it fades in, in px. */
export const PAGE_RISE = 6;
/** How far the content of a tab moves sideways while it fades in, in px. */
export const TAB_SHIFT = 8;
