// Pure helpers of the API tab: which surface comes first, which rows stay in view, the trend line of a row and the
// numbers a chart draws. Order and display only: every state comes from the server and no value is compared with a limit.
import { downsample, problemRank, sortProblemsFirst } from '../../lib';
import type { ApiMetrics, MetricState, SurfaceMetrics } from '../../types';

/**
 * The measures that give a surface its badge. Requests per minute is left out: it has no limits, so it says nothing about
 * how the surface is doing.
 */
const JUDGED = ['p50', 'p95', 'p99', 'rate4xx', 'rate5xx', 'count429'] as const;

/**
 * The badge of a surface: the worst state the server sent for its measures (critical, then warning, then unknown, then
 * ok). The contract gives a state per measure and none per surface, so this only picks the worst of them. A measure with
 * no value counts as `unknown` whatever state came with it (the figure itself reads "No data"), so a surface with no
 * data is never ok.
 * Assumed contract: a measure without limits (requests per minute) is `ok` when it has a value; see HANDOFF API-1.
 */
export function surfaceState(surface: SurfaceMetrics): MetricState {
  let worst: MetricState = 'ok';
  for (const key of JUDGED) {
    const measure = surface[key];
    // A measure the server left out, or one with a null value, counts as no data: it can never make a surface look
    // healthy, in the badge or in the "N surfaces OK" line (MeasureValue treats a null value the same way).
    const state: MetricState = !measure || measure.value === null ? 'unknown' : measure.state;
    if (problemRank(state) < problemRank(worst)) worst = state;
  }
  return worst;
}

/** Worst surface first. Surfaces with the same badge keep the order the server sent. */
export function orderSurfaces(surfaces: readonly SurfaceMetrics[]): SurfaceMetrics[] {
  return sortProblemsFirst(surfaces, surfaceState);
}

/** The rows of the surfaces table, and how many healthy surfaces are folded into the quiet line below it. */
export interface SurfaceView {
  rows: SurfaceMetrics[];
  /** Healthy surfaces that the quiet line can show or hide. 0 means there is no such line. */
  quiet: number;
}

/**
 * Problems first: once any surface is not ok, the ok ones fold into one quiet line (unless expanded). The picked surface
 * never folds away. When every surface is ok a wide screen folds nothing, because the numbers are what the table is for.
 * A phone (`compact`) folds them too: each surface is a card of nine lines, so six calm ones would push the charts two
 * screens down.
 */
export function viewSurfaces(
  ordered: readonly SurfaceMetrics[],
  picked: string | undefined,
  expanded: boolean,
  compact: boolean,
): SurfaceView {
  const fold = compact || ordered.some((surface) => surfaceState(surface) !== 'ok');
  const folded = fold
    ? ordered.filter((surface) => surfaceState(surface) === 'ok' && surface.surface !== picked)
    : [];
  return {
    rows: expanded ? [...ordered] : ordered.filter((surface) => !folded.includes(surface)),
    quiet: folded.length,
  };
}

/**
 * Points in a row's trend line. The line is small, so every range is cut into this many runs and each run keeps its
 * worst point: for 24 hours that is the worst of each hour, like the key figures above the tabs.
 */
export const TREND_POINTS = 24;

/** The p95 trend of a surface for its sparkline, one worst point per run. A gap in the series stays a gap. */
export function p95Trend(surface: SurfaceMetrics): (number | null)[] {
  return downsample(surface.series?.p95 ?? [], TREND_POINTS, surface.p95?.direction).map(
    (point) => point.value,
  );
}

/** True when at least one value is known, so there is a line to draw. */
export function hasValues(values: readonly (number | null)[]): boolean {
  return values.some((value) => value !== null);
}

/**
 * What the charts draw: the totals of all surfaces, or one surface found by its key. Undefined when the answer does not
 * hold the surface, so a chart never shows the totals under the name of a surface.
 * Assumed contract: an answer to `?surface=` still lists that surface in `surfaces`; see HANDOFF API-3.
 */
export function scopeOf(metrics: ApiMetrics, surface: string | undefined): SurfaceMetrics | undefined {
  return surface === undefined ? metrics.total : metrics.surfaces.find((item) => item.surface === surface);
}

/** The words for the chosen scope in card subtitles: the surface's name, its key while the name is unknown, or all. */
export function scopeName(metrics: ApiMetrics | undefined, surface: string | undefined): string {
  if (surface === undefined) return 'All surfaces';
  return metrics?.surfaces.find((item) => item.surface === surface)?.label || surface;
}
