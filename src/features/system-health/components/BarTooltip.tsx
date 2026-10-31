// BarTooltip: the floating readout of one uptime cell. Drawn in a portal at fixed coordinates, so the scroll box of a
// table cannot clip it. It is a mouse and keyboard readout; the same text also goes to a live region for screen readers.
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface BarTooltipProps {
  /** The cell the tooltip points at. */
  anchor: HTMLElement;
  children: ReactNode;
}

/** Placed above the cell, centred, kept 8px inside the window, and flipped below the cell when there is no room above. */
export function BarTooltip({ anchor, children }: BarTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Measured after render and set before paint: the size depends on the text, so the box never jumps.
  useLayoutEffect(() => {
    const tip = ref.current;
    if (!tip) return;
    const cell = anchor.getBoundingClientRect();
    const wanted = cell.left + cell.width / 2 - tip.offsetWidth / 2;
    const above = cell.top - tip.offsetHeight - 6;
    tip.style.left = `${Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, wanted))}px`;
    tip.style.top = `${above >= 8 ? above : cell.bottom + 6}px`;
  });

  return createPortal(
    <div ref={ref} className="tip fixed z-[90]" role="presentation">
      {children}
    </div>,
    // Inside an open modal dialog the page behind is inert, so the tooltip must live in the dialog too.
    anchor.closest('dialog[open]') ?? document.body,
  );
}
