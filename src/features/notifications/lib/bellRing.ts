// The bell's swing, played with the Web Animations API on the one icon element (owner, 2026-11-15; the website's bell does the same).
// Why not a CSS class restarted by a new React `key`: remounting the icon on every ring left the old <svg> in the DOM in development (a second, then a third
// bell next to the first). Animating the same element needs no remount. The frames mirror `@keyframes bell-ring` in src/styles/index.css; the duration and
// easing come from its tokens.

/** The swing: four decaying swings from a pivot at the top centre (the icon carries `origin-top`). */
export const RING_FRAMES: Keyframe[] = [
  { transform: 'rotate(0deg)', offset: 0 },
  { transform: 'rotate(14deg)', offset: 0.15 },
  { transform: 'rotate(-12deg)', offset: 0.37 },
  { transform: 'rotate(8deg)', offset: 0.59 },
  { transform: 'rotate(-5deg)', offset: 0.8 },
  { transform: 'rotate(0deg)', offset: 1 },
];

const token = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** A CSS time in ms: the built CSS may write `600ms` as `.6s`. */
export function cssTimeMs(value: string, fallback: number): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  return /\ds\s*$/.test(value.trim()) && !/ms\s*$/.test(value.trim()) ? n * 1000 : n;
}

/**
 * Swings `el` once and calls `done` when the swing ends or cannot play (reduced motion, no Web Animations API). Returns a function that stops it (for an
 * effect's cleanup). A stopped swing does not call `done`: React's development double effect stops and replays it, and a new ring stops the old one; the
 * swing that finishes settles the view.
 */
export function playRing(el: Element, done: () => void): () => void {
  const reduced =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || typeof el.animate !== 'function') {
    done();
    return () => {};
  }
  const ms = cssTimeMs(token('--duration-ring', '600ms'), 600);
  const animation = el.animate(RING_FRAMES, {
    duration: ms,
    easing: token('--ease-swing', 'cubic-bezier(0.37, 0, 0.63, 1)'),
  });
  animation.onfinish = () => done();
  return () => {
    animation.onfinish = null;
    animation.cancel();
  };
}
