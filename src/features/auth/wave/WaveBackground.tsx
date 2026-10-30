// WaveBackground: the decorative silk behind the sign-in card. Its drawing code loads lazily, after the form is on the
// screen, and nothing renders where a 2D canvas is unavailable: the form never depends on it.
import { lazy, Suspense, type ComponentType } from 'react';

const WaveCanvas = lazy<ComponentType>(() =>
  import('./WaveCanvas')
    .then((module) => ({ default: module.WaveCanvas }))
    // Decoration only: if its chunk cannot load (offline, a new deploy), the page goes on without it.
    .catch(() => ({ default: () => null })),
);

/** Whether this browser can draw on a 2D canvas (old browsers and the test DOM cannot). Checked once. */
function canvasSupported(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('2d'));
  } catch {
    return false;
  }
}

let supported: boolean | undefined;

export function WaveBackground() {
  supported ??= typeof document !== 'undefined' && canvasSupported();
  if (!supported) return null;
  return (
    <Suspense fallback={null}>
      <WaveCanvas />
    </Suspense>
  );
}
