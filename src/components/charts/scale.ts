// Number helpers shared by the SVG charts. Ports niceStep() and tipPlace() of 30-charts.js and compact()/num() of 00-util.js.

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Rounds a raw axis step up to 1, 2, 5 or 10 times a power of ten, so tick labels are round numbers. */
export function niceStep(value: number): number {
  if (value <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const fraction = value / power;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
}

/** 1200 -> "1.2K", 15000 -> "15K", 2500000 -> "2.5M": short axis labels. */
export function compactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
}

/** 12400 -> "12,400". */
export function formatNumber(n: number): string {
  return Number(n).toLocaleString('en-US');
}

export function sum<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

/**
 * Where a tooltip goes inside its chart box: 14px right of the pointer, flipped to the left near the right
 * edge, vertically centred on the pointer and kept inside the box.
 */
export function tooltipPosition(
  x: number,
  y: number,
  tip: { width: number; height: number },
  host: { width: number; height: number },
): { left: number; top: number } {
  let left = x + 14;
  if (left + tip.width > host.width) left = x - tip.width - 14;
  left = Math.max(0, left);
  const top = Math.max(0, Math.min(y - tip.height / 2, host.height - tip.height));
  return { left, top };
}
