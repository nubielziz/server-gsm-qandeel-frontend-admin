// The dashboard's channel, period, chart range and chart view, kept in the address so a link or reload shows the same
// screen. Changes replace the history entry: Back should leave the page, not walk through every toggle.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { DashboardDays, DashboardScope } from '../types';
import { parseView, writeView, type ChartRange, type ChartView, type DashboardView } from '../lib/view';

/** The four controls from the address, each with a setter that keeps the others. */
export function useDashboardView() {
  const [params, setParams] = useSearchParams();
  const view = useMemo(() => parseView(params), [params]);
  const change = useCallback(
    (patch: Partial<DashboardView>) => setParams((prev) => writeView(prev, patch), { replace: true }),
    [setParams],
  );
  return {
    ...view,
    setScope: useCallback((scope: DashboardScope) => change({ scope }), [change]),
    setDays: useCallback((days: DashboardDays) => change({ days }), [change]),
    setRange: useCallback((range: ChartRange) => change({ range }), [change]),
    setChartView: useCallback((chartView: ChartView) => change({ chartView }), [change]),
  };
}
