// The dashboard's channel, period and chart controls as URL search parameters (`?scope=b2c&days=14&range=12M&view=table`),
// so a link or a reload shows the same screen. Ports `ui.scope`, `ui.period`, `ui.chartRange` and `ui.chartView` of 11-state.js.
import type { DashboardDays, DashboardScope } from '../types';

/** The date range of the "Orders by type" and "Revenue by channel" charts. */
export type ChartRange = '7D' | '30D' | '12M';

/** Whether "Orders by type" draws bars or lists the numbers. */
export type ChartView = 'chart' | 'table';

export type DashboardView = {
  scope: DashboardScope;
  days: DashboardDays;
  range: ChartRange;
  chartView: ChartView;
};

/** The demo's defaults: all channels, 7 days, 30 days of chart, bars. A default is left out of the address. */
export const DEFAULT_VIEW: DashboardView = { scope: 'all', days: 7, range: '30D', chartView: 'chart' };

const SCOPES: readonly DashboardScope[] = ['all', 'b2b', 'b2c'];
const DAYS: readonly DashboardDays[] = [1, 7, 14];
const RANGES: readonly ChartRange[] = ['7D', '30D', '12M'];
const VIEWS: readonly ChartView[] = ['chart', 'table'];

/** Reads the controls from the address; a value that is missing or not one of the choices falls back to the default. */
export function parseView(params: URLSearchParams): DashboardView {
  return {
    scope: SCOPES.find((scope) => scope === params.get('scope')) ?? DEFAULT_VIEW.scope,
    days: DAYS.find((days) => String(days) === params.get('days')) ?? DEFAULT_VIEW.days,
    range: RANGES.find((range) => range === params.get('range')) ?? DEFAULT_VIEW.range,
    chartView: VIEWS.find((view) => view === params.get('view')) ?? DEFAULT_VIEW.chartView,
  };
}

/** The address with some controls changed. Defaults are left out, and anything else in the address is kept. */
export function writeView(base: URLSearchParams, patch: Partial<DashboardView>): URLSearchParams {
  const merged = { ...parseView(base), ...patch };
  const next = new URLSearchParams(base);
  const put = (key: string, value: string, standard: string) =>
    value === standard ? next.delete(key) : next.set(key, value);
  put('scope', merged.scope, DEFAULT_VIEW.scope);
  put('days', String(merged.days), String(DEFAULT_VIEW.days));
  put('range', merged.range, DEFAULT_VIEW.range);
  put('view', merged.chartView, DEFAULT_VIEW.chartView);
  return next;
}
