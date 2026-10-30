// watchSilk: what the silk painters share: the pixel ratio to draw at, and a watcher that says when to redraw (the
// canvas box changed, or the theme did, through the console's switch or the system setting).

/** Sharp enough on retina screens without painting four times the pixels on 3x phones. */
const MAX_PIXEL_RATIO = 2;

/** The screen's pixel ratio capped at 2, and lower when the canvas would pass `budget` drawing-buffer pixels. */
export function silkPixelRatio(width: number, height: number, budget = Infinity): number {
  const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
  const area = width * height;
  return area * ratio * ratio > budget ? Math.max(1, Math.sqrt(budget / area)) : ratio;
}

/** Calls `onChange` once a burst of resizes or a theme change has settled. Returns the cleanup. */
export function watchSilk(canvas: HTMLCanvasElement, onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Resizes come in bursts (window drags, rotation): wait for them to settle.
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, 120);
  };
  const resize = new ResizeObserver(schedule);
  resize.observe(canvas);
  const theme = new MutationObserver(schedule);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  scheme.addEventListener('change', schedule);
  return () => {
    clearTimeout(timer);
    resize.disconnect();
    theme.disconnect();
    scheme.removeEventListener('change', schedule);
  };
}
