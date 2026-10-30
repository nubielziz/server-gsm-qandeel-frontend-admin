// The small "up 12.3% / down 1.2 pts" mark under each key figure. Ports delta() of 40-p-dashboard.js as data, so the
// wording and the better/worse call can be tested without a screen; `components/Delta.tsx` draws it.

export type DeltaOptions = {
  /** A fall is good news (turnaround time). */
  lowerBetter?: boolean;
  /** `pct` compares as a percentage change; `pp` is for figures that already are percentages and gives percentage points. */
  kind?: 'pct' | 'pp';
};

export type Delta =
  /** Nothing to compare: this period has no figure yet, or there is no earlier period (or it was zero). */
  | { kind: 'missing'; text: 'No data yet' | 'No earlier data' }
  | { kind: 'flat' }
  /** `good` says whether the move is better, whatever its direction; the screen adds "better" or "worse" for screen readers. */
  | { kind: 'move'; direction: 'up' | 'down'; good: boolean; text: string };

const isNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Compares this period with the one before. A change under 0.05 shows as "No change". Display maths only: the server
 * sends both periods' figures; this only words the difference. The percentage uses the size of the old figure, so a
 * profit that grows from -100 to -50 reads as better.
 */
export function delta(
  current: number | null | undefined,
  previous: number | null | undefined,
  { lowerBetter = false, kind = 'pct' }: DeltaOptions = {},
): Delta {
  if (!isNumber(current)) return { kind: 'missing', text: 'No data yet' };
  if (!isNumber(previous) || previous === 0) return { kind: 'missing', text: 'No earlier data' };
  const change = kind === 'pp' ? current - previous : ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(change) < 0.05) return { kind: 'flat' };
  const up = change > 0;
  return {
    kind: 'move',
    direction: up ? 'up' : 'down',
    good: lowerBetter ? !up : up,
    text: `${Math.abs(change).toFixed(1)}${kind === 'pp' ? ' pts' : '%'}`,
  };
}
