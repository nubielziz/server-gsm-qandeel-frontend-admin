# 010 Charts

**Context.** `30-charts.js` draws the demo's charts as inline SVG: stacked bars per service type, line charts, sparklines, legends, a data-table fallback (`seriesTable`) and positioned tooltips, with fixed series colours (IMEI, Server, Remote, File) and a dark-mode redraw.

**Options.** (a) Port the SVG drawing to React components. (b) A chart library (Recharts, visx, ECharts) restyled.

**Decision.** (a). `src/components/charts`: `StackedBarChart`, `LineChart`, `Sparkline`, `ChartLegend`, `SeriesTable`, `ChartTooltip`, plus `niceStep`/scale helpers ported from the demo. Charts read colours from CSS tokens (`--s1`..`--s4`), so dark mode needs no redraw logic, and resize with a `ResizeObserver` hook.

**Why.** The charts are few and simple; a library would change look, bundle size and accessibility behaviour for no gain.

**Consequences.** No chart dependency; the dashboard and finance charts match the demo pixel for pixel in both themes.
