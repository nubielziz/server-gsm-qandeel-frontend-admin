// WaveCanvas: the canvas behind the sign-in card. Loaded lazily by WaveBackground and drawn after first paint, so the
// form never waits for it: the moving WebGL silk where the browser can, otherwise the still 2D picture.
import { useEffect, useRef, useState } from 'react';
import { paintMovingSilk } from './paintMovingSilk';
import { paintStillSilk } from './paintStillSilk';

type Painter = 'webgl' | '2d';

/** Decorative only: hidden from assistive technology and from pointer events. */
export function WaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [painter, setPainter] = useState<Painter>('webgl');
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onPainted = () => setPainted(true);
    if (painter === '2d') return paintStillSilk(canvas, onPainted);
    const stop = paintMovingSilk(canvas, onPainted);
    if (stop) return stop;
    // No WebGL here. A canvas keeps its first context, so the 2D painter gets a fresh one (the key below).
    setPainter('2d');
  }, [painter]);

  return (
    <canvas
      key={painter}
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
