// paintStillSilk: the 2D painter of the sign-in silk, for browsers without WebGL. Draws the still composition once per
// canvas box and theme, one sheet per frame into an off-screen buffer, then shows it at once, so a redraw never flickers.
import { buildSheet, drawSheet, seededRandom } from './silk';
import { readSilkPalette, silkFrame, SILK_SEED, SILK_SHEETS } from './silkScene';
import { silkPixelRatio, watchSilk } from './watchSilk';

/** Starts the painter on a canvas that has no context yet; returns its cleanup. */
export function paintStillSilk(canvas: HTMLCanvasElement, onPainted: () => void): () => void {
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  let generation = 0;
  let frame = 0;
  let requested = '';

  // Draws the whole composition for the canvas's current box and theme. A newer request cancels an older one.
  const paint = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    const ratio = silkPixelRatio(width, height);
    const palette = readSilkPalette(getComputedStyle(document.documentElement));
    // The watcher's first notice repeats the opening paint: a frame costs ~30ms, so skip it when nothing changed.
    const key = JSON.stringify([width, height, ratio, palette]);
    if (key === requested) return;
    requested = key;
    generation += 1;
    const current = generation;
    cancelAnimationFrame(frame);
    const buffer = document.createElement('canvas');
    buffer.width = Math.round(width * ratio);
    buffer.height = Math.round(height * ratio);
    const bufferContext = buffer.getContext('2d');
    if (!bufferContext) return;
    bufferContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    const box = silkFrame(width, height);
    const random = seededRandom(SILK_SEED);
    let index = 0;

    const step = () => {
      if (current !== generation) return;
      const sheet = SILK_SHEETS[index];
      if (sheet) {
        drawSheet(bufferContext, buildSheet(sheet, box, palette), palette, random);
        index += 1;
        frame = requestAnimationFrame(step);
        return;
      }
      canvas.width = buffer.width;
      canvas.height = buffer.height;
      context.drawImage(buffer, 0, 0);
      onPainted();
    };
    frame = requestAnimationFrame(step);
  };

  paint();
  const unwatch = watchSilk(canvas, paint);
  return () => {
    generation += 1;
    cancelAnimationFrame(frame);
    unwatch();
  };
}
