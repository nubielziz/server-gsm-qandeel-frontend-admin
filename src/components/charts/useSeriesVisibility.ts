// useSeriesVisibility: which series the legend has switched off. Replaces chartHidden and actions.legend (30-charts.js).
import { useCallback, useState } from 'react';
import { SERIES, type SeriesDef } from './chartSeries';

/** At least one series always stays visible, so the chart never goes blank. */
export function useSeriesVisibility(series: readonly SeriesDef[] = SERIES) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const total = series.length;

  const toggle = useCallback(
    (key: string) => {
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else if (next.size < total - 1) next.add(key);
        return next;
      });
    },
    [total],
  );

  return { hidden, toggle };
}
