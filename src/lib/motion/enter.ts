// The enter animation: a short fade with a small move, played on an element that already exists (the Web Animations API).
// Used for a new page and for the content under a tab. Enter only: nothing is remounted, delayed or played on the way out.
import { DURATION_BASE, EASE_GLIDE } from './tokens';

/** Where the element starts, in px away from its place, and how long the enter lasts. */
export interface EnterOptions {
  x?: number;
  y?: number;
  /** In ms; --duration-base when left out. */
  duration?: number;
}

/** True when the visitor asked for reduced motion (or the browser cannot tell: then motion is allowed, as in tests). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// The enter now running on each element, so a new one can stop it first.
const running = new WeakMap<Element, Animation>();

/**
 * Fades `el` in from opacity 0 while it moves from (x, y) to its place, with no fill: when it ends nothing stays on the element,
 * so a sticky or fixed child is only affected while the enter runs. A new call on the same element stops the one still running.
 * Does nothing without an element, without `el.animate` (jsdom, old browsers) or with reduced motion.
 */
export function playEnter(
  el: Element | null | undefined,
  { x = 0, y = 0, duration = DURATION_BASE }: EnterOptions = {},
): void {
  if (!el || typeof el.animate !== 'function' || prefersReducedMotion()) return;
  running.get(el)?.cancel();
  const animation = el.animate(
    [
      { opacity: 0, transform: `translate(${x}px, ${y}px)` },
      { opacity: 1, transform: 'none' },
    ],
    { duration, easing: EASE_GLIDE },
  );
  running.set(el, animation);
  const forget = () => {
    if (running.get(el) === animation) running.delete(el);
  };
  animation.onfinish = forget;
  animation.oncancel = forget;
}
