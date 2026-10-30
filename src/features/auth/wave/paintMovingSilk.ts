// paintMovingSilk: the WebGL painter of the sign-in silk. The folds flow slowly down each ribbon while the curves sway
// (silkMotion.ts), at up to 30 frames a second. With reduced motion, or without a GPU, it draws one still frame.
import { createSilkGl } from './silkGl';
import { sheetAt, SILK_MOTION } from './silkMotion';
import { readSilkPalette, silkFrame, SILK_SEED, SILK_SHEETS } from './silkScene';
import { silkPixelRatio, watchSilk } from './watchSilk';

/** Thirty frames a second: smooth for motion this slow, and half the GPU work of a 60Hz screen. */
const FRAME_MS = 1000 / 30;
/** After a pause (a background tab, a busy moment) the cloth moves on by at most this, so it never jumps. */
const MAX_STEP_MS = 100;
/** Drawing-buffer pixels at most: a multisampled buffer for a large retina screen would otherwise take ~100 MB. */
const PIXEL_BUDGET = 3_000_000;

/**
 * Starts the painter. Returns its cleanup, or null where WebGL cannot start; the canvas may then hold a WebGL
 * context already, so the 2D fallback needs a fresh canvas.
 */
export function paintMovingSilk(canvas: HTMLCanvasElement, onPainted: () => void): (() => void) | null {
  const gl = createSilkGl(
    canvas,
    SILK_SHEETS.map((sheet) => sheet.strands),
    SILK_SEED,
  );
  if (!gl) return null;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  let palette = readSilkPalette(getComputedStyle(document.documentElement));
  let seconds = 0;
  let last = 0;
  let frame = 0;
  let painted = false;

  // One frame of the cloth as it stands `seconds` into the motion; at 0 it is the still composition.
  const draw = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    gl.resize(width, height, silkPixelRatio(width, height, PIXEL_BUDGET));
    const sheets = SILK_SHEETS.map((sheet, index) => {
      const motion = SILK_MOTION[index];
      return motion ? sheetAt(sheet, motion, seconds) : sheet;
    });
    gl.draw(sheets, silkFrame(width, height), palette);
    if (!painted) {
      painted = true;
      onPainted();
    }
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    if (last !== 0 && now - last < FRAME_MS - 1) return;
    if (last !== 0) seconds += Math.min(now - last, MAX_STEP_MS) / 1000;
    last = now;
    draw();
  };
  const play = () => {
    cancelAnimationFrame(frame);
    last = 0;
    frame = requestAnimationFrame(tick);
  };
  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  // Moves only on a GPU and without a reduced-motion setting.
  const moving = () => gl.fast && !still.matches;
  // Otherwise the cloth stops where it is (the still composition if it never moved) and is drawn once.
  const follow = () => {
    if (moving()) play();
    else {
      pause();
      draw();
    }
  };
  // A new box or theme: re-read the palette; a moving cloth picks it up on its next frame.
  const refresh = () => {
    palette = readSilkPalette(getComputedStyle(document.documentElement));
    if (!moving()) draw();
  };

  follow();
  const unwatch = watchSilk(canvas, refresh);
  still.addEventListener('change', follow);
  return () => {
    pause();
    unwatch();
    still.removeEventListener('change', follow);
    gl.dispose();
  };
}
