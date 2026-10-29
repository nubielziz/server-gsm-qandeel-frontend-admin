// useChartCursor: which data point is highlighted, by pointer or keyboard. Shared by both charts (drawStacked/drawLine).
import { useState, type KeyboardEvent } from 'react';
import { clamp } from './scale';

/**
 * `keyboardAnchor` says where the tooltip sits when a point is reached with the arrow keys (there is no
 * pointer). ArrowLeft/ArrowRight step through the points, Escape hides the tooltip.
 */
export function useChartCursor(count: number, keyboardAnchor: (index: number) => { x: number; y: number }) {
  const [active, setActive] = useState<number | null>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });

  const show = (index: number, x: number, y: number) => {
    setActive(index);
    setAnchor({ x, y });
  };
  const hide = () => setActive(null);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Escape') return;
    e.preventDefault();
    if (e.key === 'Escape') return hide();
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const index = clamp((active ?? (step > 0 ? -1 : count)) + step, 0, count - 1);
    const spot = keyboardAnchor(index);
    show(index, spot.x, spot.y);
  };

  return { active, anchor, show, hide, onKeyDown };
}
