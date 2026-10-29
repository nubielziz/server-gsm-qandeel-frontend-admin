// useElementWidth: the pixel width of an element, kept current with a ResizeObserver (replaces mountCharts()/ro).
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Attach the returned ref to the chart box. Width is 0 until the first measurement. */
export function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.floor(el.clientWidth));
    measure();
    // jsdom and very old browsers have no ResizeObserver: the first measurement still draws the chart.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
