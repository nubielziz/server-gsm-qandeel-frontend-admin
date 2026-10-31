// Tests for chart.ts: the axis top and labels per unit, and the server's threshold as the chart's dashed line.
import { describe, expect, it } from 'vitest';
import type { SeriesPoint } from '../types';
import { axisFormat, downsample, niceTop, thresholdOnAxis, thresholdReference, unitCaption } from './chart';

describe('niceTop', () => {
  it('takes the smallest round step that fits, so a 6.2 s peak gets 7.5 s and not 15 s', () => {
    expect(niceTop(6200, 3)).toBe(7500);
    expect(niceTop(5800, 3)).toBe(6000);
    expect(niceTop(0.42, 3)).toBe(0.6);
    expect(niceTop(99.9, 3, 99)).toBeCloseTo(100.5);
  });

  it('gives a plain axis when there is nothing above the bottom', () => {
    expect(niceTop(0, 3)).toBe(3);
    expect(niceTop(-Infinity, 3)).toBe(3);
  });
});

describe('axisFormat', () => {
  it('reads milliseconds as seconds once the axis passes a second, matching the "crit 5 s" label', () => {
    const axis = axisFormat('ms', 7500);
    expect(axis.caption).toBe('Seconds');
    expect([0, 2500, 5000, 7500].map(axis.format)).toEqual(['0', '2.5', '5', '7.5']);
    expect(axisFormat('ms', 600)).toMatchObject({ caption: 'Milliseconds' });
    expect(axisFormat('ms', 600).format(200)).toBe('200');
  });

  it('turns compact only when the top reaches 10,000, so one axis never mixes styles', () => {
    expect([0, 5000, 10000, 15000].map(axisFormat('per_min', 15000).format)).toEqual([
      '0',
      '5K',
      '10K',
      '15K',
    ]);
    expect([0, 2500, 5000, 7500].map(axisFormat('count', 7500).format)).toEqual([
      '0',
      '2,500',
      '5,000',
      '7,500',
    ]);
  });

  it('keeps decimals on a small axis and short forms for durations and sizes', () => {
    expect(axisFormat('percent', 1.5).format(0.5)).toBe('0.5');
    expect(axisFormat('s', 900).format(300)).toBe('5m');
    expect(axisFormat('bytes', 2048).format(1024)).toBe('1 KB');
  });
});

describe('thresholdOnAxis', () => {
  const crit = { value: 1500, label: 'crit 1.5 s', bad: 'above' as const };

  it('draws a bad-above threshold only when the line comes within 2.5 times of it', () => {
    expect(thresholdOnAxis(crit, 700)).toBe(true);
    expect(thresholdOnAxis(crit, 300)).toBe(false);
  });

  it('always draws a bad-below threshold, such as uptime', () => {
    expect(thresholdOnAxis({ value: 99.5, label: 'crit 99.5 %', bad: 'below' }, 99.9)).toBe(true);
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
