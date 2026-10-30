// WaveCanvas: paints the silk sheets behind the sign-in card. Loaded lazily by WaveBackground and drawn after first
// paint, one sheet per frame into an off-screen buffer, so the form never waits for it. Redraws when the canvas box or
// the theme changes.
import { useEffect, useRef, useState } from 'react';
import { buildSheet, drawSheet, seededRandom } from './silk';
import { readSilkPalette, silkFrame, SILK_SEED, SILK_SHEETS } from './silkScene';

/** Sharp enough on retina screens without painting four times the pixels on 3x phones. */
const MAX_PIXEL_RATIO = 2;

/** Decorative only: hidden from assistive technology and from pointer events. */
export function WaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    let generation = 0;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Draws the whole composition for the canvas's current box and theme. A newer request cancels an older one.
    const paint = () => {
      generation += 1;
      const current = generation;
      cancelAnimationFrame(frame);
      const { width, height } = canvas.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
      const buffer = document.createElement('canvas');
      buffer.width = Math.round(width * ratio);
      buffer.height = Math.round(height * ratio);
      const bufferContext = buffer.getContext('2d');
      if (!bufferContext) return;
      bufferContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      const palette = readSilkPalette(getComputedStyle(document.documentElement));
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
        // All sheets are ready: show them at once, so a redraw never flickers.
        canvas.width = buffer.width;
        canvas.height = buffer.height;
        context.drawImage(buffer, 0, 0);
        setPainted(true);
      };
      frame = requestAnimationFrame(step);
    };

    // Resizes come in bursts (window drags, rotation): wait for them to settle.
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(paint, 120);
    };

    paint();
    const resize = new ResizeObserver(schedule);
    resize.observe(canvas);
    const theme = new MutationObserver(schedule);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', schedule);

    return () => {
      generation += 1;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      resize.disconnect();
      theme.disconnect();
      scheme.removeEventListener('change', schedule);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={[
        // Phones: a band across the top, about a third of the screen. Its height follows the width only, so the
        // on-screen keyboard never redraws it, and its lower edge fades out so no ribbon ends on a hard line. Wide
        // screens: the whole viewport, behind the card. AuthShell places the phone card from the same height.
        'pointer-events-none absolute inset-x-0 top-0 h-[clamp(240px,68vw,330px)] w-full md:fixed md:inset-0 md:h-full',
        '[mask-image:linear-gradient(to_bottom,#000_72%,transparent)] md:[mask-image:none]',
        'transition-opacity duration-200 motion-reduce:transition-none',
        painted ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    />
  );
}
