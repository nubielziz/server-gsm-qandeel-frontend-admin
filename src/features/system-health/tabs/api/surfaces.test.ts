// Tests for surfaces.ts: the badge of a surface, worst-first order, the quiet line, the trend and the chart scope.
import { describe, expect, it } from 'vitest';
import type { ApiMetrics, Measure, MetricState, SeriesPoint, SurfaceMetrics } from '../../types';
import {
  TREND_POINTS,
  hasValues,
  orderSurfaces,
  p95Trend,
  scopeName,
  scopeOf,
  surfaceState,
  viewSurfaces,
} from './surfaces';

const measure = (state: MetricState, value: number | null = 10): Measure => ({
  value: state === 'unknown' ? null : value,
  unit: 'ms',
  state,
  warn: 800,
  crit: 1500,
  direction: 'above',
});

const at = (index: number) => new Date(Date.UTC(2026, 2, 5, 0, index * 15)).toISOString();
const series = (values: (number | null)[]): SeriesPoint[] => values.map((value, i) => ({ at: at(i), value }));

/** A surface whose measures all have the same state, unless `states` says otherwise. */
function surface(key: string, states: Partial<Record<string, MetricState>> = {}, base: MetricState = 'ok') {
  const state = (name: string): MetricState => states[name] ?? base;
  const empty = series([]);
  return {
    surface: key,
    label: `Surface ${key}`,
    requestsPerMin: { ...measure(state('requestsPerMin')), unit: 'per_min' },
    p50: measure(state('p50')),
    p95: measure(state('p95')),
    p99: measure(state('p99')),
    rate4xx: { ...measure(state('rate4xx')), unit: 'percent' },
    rate5xx: { ...measure(state('rate5xx')), unit: 'percent' },
    count429: { ...measure(state('count429')), unit: 'count' },
    series: { requestsPerMin: empty, p50: empty, p95: empty, p99: empty, rate4xx: empty, rate5xx: empty },
  } satisfies SurfaceMetrics;
}

describe('surfaceState', () => {
  it('is the worst state the server sent for the measures', () => {
    expect(surfaceState(surface('a'))).toBe('ok');
    expect(surfaceState(surface('a', { p99: 'warn' }))).toBe('warn');
    expect(surfaceState(surface('a', { p99: 'warn', rate5xx: 'crit' }))).toBe('crit');
    expect(surfaceState(surface('a', { count429: 'crit', p95: 'warn' }))).toBe('crit');
  });

  it('is unknown, never ok, when a measure has no data', () => {
    expect(surfaceState(surface('a', { p95: 'unknown' }))).toBe('unknown');
    expect(surfaceState(surface('a', {}, 'unknown'))).toBe('unknown');
  });

  it('puts a warning before unknown, like the problem order of the page', () => {
    expect(surfaceState(surface('a', { p95: 'unknown', rate4xx: 'warn' }))).toBe('warn');
  });

  it('leaves requests per minute out: it has no limits', () => {
    expect(surfaceState(surface('a', { requestsPerMin: 'unknown' }))).toBe('ok');
  });

  it('reads a measure the server left out as no data', () => {
    const partial = { ...surface('a'), p99: undefined } as unknown as SurfaceMetrics;
    expect(surfaceState(partial)).toBe('unknown');
  });

  it('reads a null value as no data whatever state came with it, so the badge is never ok', () => {
    const base = surface('a');
    const nullWith = (state: MetricState): SurfaceMetrics => ({
      ...base,
      p95: { ...base.p95, value: null, state },
    });
    expect(surfaceState(nullWith('ok'))).toBe('unknown');
    expect(surfaceState(nullWith('warn'))).toBe('unknown');
    expect(surfaceState(nullWith('crit'))).toBe('unknown');
    // Every judged measure counts, not only the first.
    for (const key of ['p50', 'p99', 'rate4xx', 'rate5xx', 'count429'] as const) {
      const one: SurfaceMetrics = { ...base, [key]: { ...base[key], value: null, state: 'ok' } };
      expect(surfaceState(one)).toBe('unknown');
    }
  });

  it('still lets a real problem outrank a null value', () => {
    const base = surface('a', { rate5xx: 'crit' });
    expect(surfaceState({ ...base, p95: { ...base.p95, value: null, state: 'ok' } })).toBe('crit');
  });

  it('leaves a null requests per minute out, like its state', () => {
    const base = surface('a');
    expect(surfaceState({ ...base, requestsPerMin: { ...base.requestsPerMin, value: null } })).toBe('ok');
  });
});

describe('orderSurfaces', () => {
  it('puts the worst first and keeps the server order inside a state', () => {
    const rows = [
      surface('ok1'),
      surface('warn1', { p95: 'warn' }),
      surface('crit1', { p95: 'crit' }),
      surface('ok2'),
      surface('none', { p95: 'unknown' }),
      surface('warn2', { rate5xx: 'warn' }),
    ];
    expect(orderSurfaces(rows).map((row) => row.surface)).toEqual([
      'crit1',
      'warn1',
      'warn2',
      'none',
      'ok1',
      'ok2',
    ]);
  });

  it('does not change the list it is given', () => {
    const rows = [surface('b'), surface('a', { p95: 'crit' })];
    orderSurfaces(rows);
    expect(rows.map((row) => row.surface)).toEqual(['b', 'a']);
  });
});

describe('viewSurfaces', () => {
  const ordered = orderSurfaces([
    surface('v1', { p95: 'crit' }),
    surface('dhru', { p95: 'warn' }),
    surface('client'),
    surface('store'),
    surface('hooks', { p95: 'unknown' }),
  ]);
  const keys = (rows: SurfaceMetrics[]) => rows.map((row) => row.surface);

  it('folds the ok surfaces into the quiet line while another surface has a problem', () => {
    const view = viewSurfaces(ordered, undefined, false, false);
    expect(keys(view.rows)).toEqual(['v1', 'dhru', 'hooks']);
    expect(view.quiet).toBe(2);
  });

  it('counts a surface with no data as a problem, not as quiet', () => {
    expect(keys(viewSurfaces(ordered, undefined, false, false).rows)).toContain('hooks');
  });

  it('shows every surface, still worst first, when the line is expanded', () => {
    const view = viewSurfaces(ordered, undefined, true, false);
    expect(keys(view.rows)).toEqual(['v1', 'dhru', 'hooks', 'client', 'store']);
    expect(view.quiet).toBe(2);
  });

  it('keeps the picked surface in view even when it is ok', () => {
    const view = viewSurfaces(ordered, 'store', false, false);
    expect(keys(view.rows)).toEqual(['v1', 'dhru', 'hooks', 'store']);
    expect(view.quiet).toBe(1);
  });

  it('folds nothing on a wide screen when every surface is ok: the numbers are what the table is for', () => {
    const calm = [surface('a'), surface('b'), surface('c')];
    const view = viewSurfaces(calm, undefined, false, false);
    expect(keys(view.rows)).toEqual(['a', 'b', 'c']);
    expect(view.quiet).toBe(0);
  });

  describe('on a phone', () => {
    const calm = [surface('a'), surface('b'), surface('c')];

    it('folds every surface into the quiet line when all are ok', () => {
      const view = viewSurfaces(calm, undefined, false, true);
      expect(view.rows).toEqual([]);
      expect(view.quiet).toBe(3);
    });

    it('shows them all, in order, when the line is expanded', () => {
      const view = viewSurfaces(calm, undefined, true, true);
      expect(keys(view.rows)).toEqual(['a', 'b', 'c']);
      expect(view.quiet).toBe(3);
    });

    it('keeps the picked surface in view and folds the other ones', () => {
      const view = viewSurfaces(calm, 'b', false, true);
      expect(keys(view.rows)).toEqual(['b']);
      expect(view.quiet).toBe(2);
    });

    it('does not fold a surface with no data: it is not ok', () => {
      const view = viewSurfaces(
        orderSurfaces([surface('a'), surface('none', { p95: 'unknown' })]),
        undefined,
        false,
        true,
      );
      expect(keys(view.rows)).toEqual(['none']);
      expect(view.quiet).toBe(1);
    });
  });

  it('does not fold a surface whose figure is null with an ok state: it has no data', () => {
    const base = surface('gap');
    const nullFigure: SurfaceMetrics = { ...base, p99: { ...base.p99, value: null, state: 'ok' } };
    const view = viewSurfaces(orderSurfaces([surface('a'), nullFigure]), undefined, false, false);
    expect(keys(view.rows)).toEqual(['gap']);
    expect(view.quiet).toBe(1);
    // On a phone too: a lone surface like this is a problem to show, not a quiet "1 surface OK".
    expect(keys(viewSurfaces([nullFigure], undefined, false, true).rows)).toEqual(['gap']);
    expect(viewSurfaces([nullFigure], undefined, false, true).quiet).toBe(0);
  });

  it('has no quiet line when every surface has a problem', () => {
    const view = viewSurfaces(
      orderSurfaces([surface('a', { p95: 'crit' }), surface('b', { p95: 'warn' })]),
      undefined,
      false,
      false,
    );
    expect(view.quiet).toBe(0);
    expect(view.rows).toHaveLength(2);
  });
});

describe('p95Trend', () => {
  const withP95 = (values: (number | null)[]): SurfaceMetrics => ({
    ...surface('a'),
    series: { ...surface('a').series, p95: series(values) },
  });

  it('keeps a short series as it is', () => {
    expect(p95Trend(withP95([1, null, 3]))).toEqual([1, null, 3]);
  });

  it('cuts a long series to one worst point per run: for 24 hours, the worst of each hour', () => {
    // 96 quarter-hours: hour h has the values h, h, h, 100 + h, so the worst of each hour is 100 + h.
    const values = Array.from({ length: 96 }, (_, i) =>
      i % 4 === 3 ? 100 + Math.floor(i / 4) : Math.floor(i / 4),
    );
    const trend = p95Trend(withP95(values));
    expect(trend).toHaveLength(TREND_POINTS);
    expect(trend[0]).toBe(100);
    expect(trend[23]).toBe(123);
  });

  it('keeps a run without data as a gap and never turns it into zero', () => {
    const values = [...Array.from({ length: 48 }, () => 5), ...Array.from({ length: 48 }, () => null)];
    const trend = p95Trend(withP95(values));
    expect(trend.slice(0, 12).every((value) => value === 5)).toBe(true);
    expect(trend.slice(12).every((value) => value === null)).toBe(true);
  });

  it('is empty when the surface has no series', () => {
    const broken = { ...surface('a'), series: undefined } as unknown as SurfaceMetrics;
    expect(p95Trend(broken)).toEqual([]);
  });
});

describe('hasValues', () => {
  it('is true with at least one known value, even a zero', () => {
    expect(hasValues([null, 0, null])).toBe(true);
    expect(hasValues([null, null])).toBe(false);
    expect(hasValues([])).toBe(false);
  });
});

describe('scopeOf and scopeName', () => {
  const a = surface('a');
  const b = surface('b');
  const metrics: ApiMetrics = {
    range: '24h',
    bucketSeconds: 900,
    total: { ...surface('total'), label: 'All surfaces' },
    surfaces: [a, b],
    slowest: [],
  };

  it('draws the totals for all surfaces and one surface by its key', () => {
    expect(scopeOf(metrics, undefined)).toBe(metrics.total);
    expect(scopeOf(metrics, 'b')).toBe(b);
  });

  it('finds nothing for a surface the answer does not hold, instead of showing the totals under its name', () => {
    expect(scopeOf(metrics, 'ghost')).toBeUndefined();
  });

  it('names the scope: all surfaces, the surface by its label, or its key until the label is known', () => {
    expect(scopeName(metrics, undefined)).toBe('All surfaces');
    expect(scopeName(metrics, 'b')).toBe('Surface b');
    expect(scopeName(metrics, 'ghost')).toBe('ghost');
    expect(scopeName(undefined, 'b')).toBe('b');
  });
});
