// Tests for chart.ts: axis and tooltip text per unit, and the server's threshold as the chart's dashed line.
import { describe, expect, it } from 'vitest';
import type { SeriesPoint } from '../types';
import { chartFormat, downsample, thresholdReference, unitCaption } from './chart';

describe('chartFormat', () => {
  it('keeps axis labels short and leaves the unit to the tooltip suffix', () => {
    expect(chartFormat('ms').format(250)).toBe('250');
    expect(chartFormat('ms').suffix).toBe(' ms');
    expect(chartFormat('percent').format(0.42)).toBe('0.42');
    expect(chartFormat('percent').suffix).toBe(' %');
    expect(chartFormat('per_min').format(1240)).toBe('1,240');
    expect(chartFormat('per_min').suffix).toBe(' /min');
    expect(chartFormat('count').suffix).toBe('');
  });

  it('goes compact from 10,000 up so the label fits the axis', () => {
    expect(chartFormat('per_min').format(12400)).toBe('12K');
    expect(chartFormat('ms').format(9999)).toBe('9,999');
  });

  it('cleans up float noise on the ticks', () => {
    expect(chartFormat('percent').format(0.30000000000000004)).toBe('0.3');
  });

  it('prints seconds as one-unit durations', () => {
    expect(chartFormat('s').format(45)).toBe('45s');
    expect(chartFormat('s').format(192)).toBe('3.2m');
    expect(chartFormat('s').format(5400)).toBe('1.5h');
    expect(chartFormat('s').suffix).toBe('');
  });

  it('prints bytes with their unit', () => {
    expect(chartFormat('bytes').format(1288490189)).toBe('1.2 GB');
  });
});

describe('unitCaption', () => {
  it('names the unit of every axis', () => {
    expect(unitCaption('ms')).toBe('Milliseconds');
    expect(unitCaption('percent')).toBe('Percent');
    expect(unitCaption('per_min')).toBe('Per minute');
    expect(unitCaption('count')).toBe('Count');
    expect(unitCaption('s')).toBe('Duration');
    expect(unitCaption('bytes')).toBe('Size');
  });
});

describe('thresholdReference', () => {
  it('draws the crit threshold, bad above, for latency', () => {
    expect(thresholdReference({ unit: 'ms', warn: 800, crit: 1500, direction: 'above' })).toEqual({
      value: 1500,
      label: 'crit 1.5 s',
      bad: 'above',
    });
  });

  it('falls back to the warn threshold', () => {
    expect(thresholdReference({ unit: 'ms', warn: 800, crit: null, direction: 'above' })).toEqual({
      value: 800,
      label: 'warn 800 ms',
      bad: 'above',
    });
    expect(thresholdReference({ unit: 'percent', warn: 0.5, direction: 'above' })?.label).toBe('warn 0.5 %');
  });

  it('keeps the direction of the server: uptime is bad below', () => {
    expect(thresholdReference({ unit: 'percent', warn: 99.9, crit: 99.5, direction: 'below' })).toEqual({
      value: 99.5,
      label: 'crit 99.5 %',
      bad: 'below',
    });
  });

  it('treats a threshold without a direction as bad above', () => {
    expect(thresholdReference({ unit: 'count', warn: 5 })?.bad).toBe('above');
  });

  it('is undefined when the measure has no threshold, so no line is drawn', () => {
    expect(thresholdReference({ unit: 'ms' })).toBeUndefined();
    expect(thresholdReference({ unit: 'ms', warn: null, crit: null })).toBeUndefined();
  });
});

describe('downsample', () => {
  const series = (values: (number | null)[]): SeriesPoint[] =>
    values.map((value, i) => ({ at: `2026-10-31T00:${String(i).padStart(2, '0')}:00.000Z`, value }));

  it('keeps the worst point of each run: the highest by default, the lowest when the bad side is below', () => {
    const points = series([1, 5, 2, 2, 7, 3]);
    expect(downsample(points, 3).map((p) => p.value)).toEqual([5, 2, 7]);
    expect(downsample(points, 3, 'below').map((p) => p.value)).toEqual([1, 2, 3]);
    expect(downsample(points, 3).map((p) => p.at)).toEqual([points[0]!.at, points[2]!.at, points[4]!.at]);
  });

  it('keeps a run without data as a gap and skips gaps inside a run', () => {
    expect(downsample(series([null, null, 4, null]), 2).map((p) => p.value)).toEqual([null, 4]);
  });

  it('returns a short series as it is', () => {
    const points = series([1, 2]);
    expect(downsample(points, 24)).toEqual(points);
    expect(downsample([], 24)).toEqual([]);
  });
});
