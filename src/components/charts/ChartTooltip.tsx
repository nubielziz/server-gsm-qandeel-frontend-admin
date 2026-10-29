// ChartTooltip: the floating value box of a chart (the demo's .tip + tipPlace()).
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { tooltipPosition } from './scale';

export interface ChartTooltipProps {
  /** Pointer position inside the chart box, in px. */
  x: number;
  y: number;
  /** Size of the chart box, used to keep the tooltip inside it. */
  boxWidth: number;
  boxHeight: number;
  children: ReactNode;
}

/** Measured after render (its size depends on its content) and placed before paint, so it never jumps. */
export function ChartTooltip({ x, y, boxWidth, boxHeight, children }: ChartTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const tip = ref.current;
    if (!tip) return;
    const spot = tooltipPosition(
      x,
      y,
      { width: tip.offsetWidth, height: tip.offsetHeight },
      { width: boxWidth, height: boxHeight },
    );
    tip.style.left = `${spot.left}px`;
    tip.style.top = `${spot.top}px`;
  });

  return (
    <div ref={ref} className="tip" role="presentation">
      {children}
    </div>
  );
}
