// Tests for range.ts: range options and labels, the x-axis text of a bucket, and series points that keep their gaps.
import { describe, expect, it } from 'vitest';
import type { SeriesPoint } from '../types';
import {
  RANGES,
  RANGE_ITEMS,
  RANGE_LABEL,
  chartDetail,
  chartLabel,
  isTimeRange,
  toLinePoints,
} from './range';

// Built from local time parts, so the clock text is the same in every time zone.
const at = (hours: number, minutes: number) => new Date(2026, 2, 5, hours, minutes).toISOString();

describe('range options', () => {
  it('lists 1h, 6h, 24h and 7d for the header control', () => {
    expect(RANGES).toEqual(['1h', '6h', '24h', '7d']);
    expect(RANGE_ITEMS).toEqual([
      { value: '1h', label: '1h' },
      { value: '6h', label: '6h' },
      { value: '24h', label: '24h' },
      { value: '7d', label: '7d' },
    ]);
  });

  it('has a sentence for every range', () => {
    expect(RANGE_LABEL).toEqual({
      '1h': 'Last hour',
      '6h': 'Last 6 hours',
      '24h': 'Last 24 hours',
      '7d': 'Last 7 days',
    });
  });

  it('recognises a range from the address and refuses anything else', () => {
    expect(isTimeRange('6h')).toBe(true);
    expect(isTimeRange('30d')).toBe(false);
    expect(isTimeRange(null)).toBe(false);
    expect(isTimeRange(undefined)).toBe(false);
  });
});

describe('chart labels', () => {
  it('is the time of day for the short ranges', () => {
    expect(chartLabel(at(14, 7), '1h')).toBe('14:07');
    expect(chartLabel(at(9, 30), '6h')).toBe('09:30');
    expect(chartLabel(at(23, 45), '24h')).toBe('23:45');
  });

  it('adds the weekday for 7 days, because the same hour comes round every day', () => {
    // 5 March 2026 is a Thursday.
    expect(chartLabel(at(14, 0), '7d')).toBe('Thu 14:00');
  });

  it('is empty for a time that cannot be read', () => {
    expect(chartLabel('not a time', '24h')).toBe('');
    expect(chartDetail('not a time')).toBe('');
  });

  it('writes the long label with the day and the time', () => {
    expect(chartDetail(at(14, 7))).toMatch(/Thu.*05.*Mar.*14:07/);
  });
});

describe('toLinePoints', () => {
  const points: SeriesPoint[] = [
    { at: at(10, 0), value: 120 },
    { at: at(11, 0), value: null },
    { at: at(12, 0), value: 0 },
  ];

  it('keeps the order, the zeros and the gaps', () => {
    const line = toLinePoints(points, '24h');
    expect(line.map((point) => point.value)).toEqual([120, null, 0]);
    expect(line.map((point) => point.label)).toEqual(['10:00', '11:00', '12:00']);
  });

  it('gives each point a long label for its tooltip', () => {
    for (const point of toLinePoints(points, '24h')) expect(point.detail).toMatch(/Thu.*Mar/);
  });

  it('is empty for no points', () => {
    expect(toLinePoints([], '1h')).toEqual([]);
  });
});
