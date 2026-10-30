// Tests for the stat words and chart numbers: times, the runway sentence, the 90% target and the chart points.
import { describe, expect, it } from 'vitest';
import type { HourlyPoint } from '../types';
import {
  averageSuccess,
  belowTarget,
  chartPoints,
  latencyLabel,
  minutesText,
  msOrDash,
  msText,
  percentLabel,
  runwayText,
} from './metrics';

describe('msText', () => {
  it('writes milliseconds under a second and seconds above, with a non-breaking space', () => {
    expect(msText(310)).toBe('310\u00a0ms');
    expect(msText(999.6)).toBe('1000\u00a0ms');
    expect(msText(2380)).toBe('2.4\u00a0s');
    expect(msOrDash(null)).toBe('–');
    expect(msOrDash(640)).toBe('640\u00a0ms');
  });
});

describe('runwayText', () => {
  it('words the days the balance lasts like the demo', () => {
    expect(runwayText(0.4)).toBe('Less than a day of volume at the 7-day rate');
    expect(runwayText(3.46)).toBe('About 3.5 days of volume at the 7-day rate');
    expect(runwayText(18.2)).toBe('About 18 days of volume at the 7-day rate');
    expect(runwayText(120)).toBe('More than 90 days of volume at the 7-day rate');
  });

  it('says there is no volume when nothing was spent', () => {
    expect(runwayText(null)).toBe('No volume in the last 7 days');
  });
});

describe('minutesText', () => {
  it('keeps the two largest units', () => {
    expect(minutesText(0)).toBe('<1m');
    expect(minutesText(45)).toBe('45m');
    expect(minutesText(125)).toBe('2h\u00a05m');
    expect(minutesText(180)).toBe('3h');
    expect(minutesText(2880)).toBe('2d');
    expect(minutesText(4440)).toBe('3d\u00a02h');
  });
});

describe('the 90% target and the chart labels', () => {
  it('is below target only for a known rate under 90', () => {
    expect(belowTarget(89.9)).toBe(true);
    expect(belowTarget(90)).toBe(false);
    expect(belowTarget(null)).toBe(false);
  });

  it('labels the axes', () => {
    expect(percentLabel(97.8)).toBe('98%');
    expect(latencyLabel(310.4)).toBe('310');
    expect(latencyLabel(2380)).toBe('2380');
  });
});

describe('the hourly history', () => {
  const history: HourlyPoint[] = [
    { at: '2026-03-01T10:00:00.000Z', successRate: 98, medianMs: 300 },
    { at: '2026-03-01T11:00:00.000Z', successRate: 90, medianMs: 500 },
  ];

  it('becomes chart points with the value picked and a date for the tooltip', () => {
    const points = chartPoints(history, (point) => point.medianMs);
    expect(points.map((point) => point.value)).toEqual([300, 500]);
    expect(points[0].label).toMatch(/^\d\d:\d\d$/);
    expect(points[0].detail).toMatch(/^\d\d \w{3}, \d\d:\d\d$/);
  });

  it('averages the success rates, and gives null for no history', () => {
    expect(averageSuccess(history)).toBe(94);
    expect(averageSuccess([])).toBeNull();
  });
});
