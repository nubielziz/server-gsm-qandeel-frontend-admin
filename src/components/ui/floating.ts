// Placement math for anchored popovers (menus, info notes). Port of placeMenu() in 20-ui.js.

export type FloatingAlign = 'start' | 'end';

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Where a fixed-position panel goes: under the anchor, edge-aligned, kept 8px inside the viewport,
 * and flipped above the anchor when there is no room below. Pure so it can be tested without a browser.
 */
export function floatingPosition(
  anchor: Box,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  align: FloatingAlign = 'end',
  gap = 4,
  margin = 8,
): { left: number; top: number } {
  const wanted = align === 'end' ? anchor.right - size.width : anchor.left;
  const left = Math.min(viewport.width - size.width - margin, Math.max(margin, wanted));
  let top = anchor.bottom + gap;
  if (top + size.height > viewport.height - margin) top = Math.max(margin, anchor.top - size.height - gap);
  return { left, top };
}
