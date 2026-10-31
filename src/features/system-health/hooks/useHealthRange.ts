// The range of the System health charts and ranked lists, kept in the address (`?range=7d`). The KPI row and the "now"
// values ignore it. The default (24 hours) leaves no parameter, like the other pages' defaults.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import type { TimeRange } from '../types';

/** The four ranges, shortest first: the choices of the range switch. */
export const HEALTH_RANGES: readonly TimeRange[] = ['1h', '6h', '24h', '7d'];

/** The range used when the address names none, or one that is not a choice. */
export const DEFAULT_RANGE: TimeRange = '24h';

/** Reads `?range=`; a missing or unknown value falls back to 24 hours. */
export function parseRange(raw: string | null): TimeRange {
  return HEALTH_RANGES.find((range) => range === raw) ?? DEFAULT_RANGE;
}

/**
 * `[range, setRange]` from the address. Changing the range replaces the history entry (Back should leave the page, not
 * walk through every toggle) and keeps every other parameter, such as the open tab.
 */
export function useHealthRange(): [TimeRange, (next: TimeRange) => void] {
  const [params, setParams] = useSearchParams();
  const range = parseRange(params.get('range'));
  const setRange = useCallback(
    (next: TimeRange) =>
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous);
          if (next === DEFAULT_RANGE) updated.delete('range');
          else updated.set('range', next);
          return updated;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [range, setRange];
}
