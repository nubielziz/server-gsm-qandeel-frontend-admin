// Public surface of the chart kit: React SVG ports of the demo's 30-charts.js (decision 010). No chart library.
export * from './StackedBarChart';
export * from './LineChart';
export * from './Sparkline';
export * from './ChartLegend';
export * from './SeriesTable';
export * from './ChartTooltip';
export { SERIES, colorVar } from './chartSeries';
export type { ChartColor, SeriesDef, StackedRow } from './chartSeries';
export { useSeriesVisibility } from './useSeriesVisibility';
export { useElementWidth } from './useElementWidth';
export { clamp, compactNumber, formatNumber, niceStep, sum } from './scale';
