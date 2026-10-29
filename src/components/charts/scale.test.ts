// Tests for the chart number helpers: round axis steps, compact labels, tooltip placement.
import { describe, expect, it } from 'vitest';
import { clamp, compactNumber, formatNumber, niceStep, sum, tooltipPosition } from './scale';

describe('niceStep', () => {
  it('rounds up to 1, 2, 5 or 10 times a power of ten', () => {
    expect(niceStep(0.7)).toBe(1);
    expect(niceStep(1.5)).toBe(2);
    expect(niceStep(3)).toBe(5);
    expect(niceStep(7)).toBe(10);
    expect(niceStep(23)).toBe(50);
    expect(niceStep(180)).toBe(200);
    expect(niceStep(1000)).toBe(1000);
  });

  it('never returns zero or a negative step', () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(-4)).toBe(1);
  });
});

describe('compactNumber', () => {
  it('shortens thousands and millions', () => {
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(999)).toBe('999');
    expect(compactNumber(1000)).toBe('1K');
    expect(compactNumber(1200)).toBe('1.2K');
    expect(compactNumber(15000)).toBe('15K');
    expect(compactNumber(2_500_000)).toBe('2.5M');
    expect(compactNumber(12_000_000)).toBe('12M');
  });
});

describe('formatNumber, clamp, sum', () => {
  it('groups thousands', () => {
    expect(formatNumber(12400)).toBe('12,400');
  });
  it('clamps into a range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
  it('sums a picked field', () => {
    expect(sum([{ n: 1 }, { n: 2 }, { n: 4 }], (x) => x.n)).toBe(7);
  });
});

describe('tooltipPosition', () => {
  const tip = { width: 100, height: 40 };
  const host = { width: 400, height: 200 };

  it('sits 14px right of the pointer and is centred vertically on it', () => {
    expect(tooltipPosition(50, 100, tip, host)).toEqual({ left: 64, top: 80 });
  });

  it('flips to the left of the pointer near the right edge', () => {
    expect(tooltipPosition(350, 100, tip, host)).toEqual({ left: 236, top: 80 });
  });

  it('stays inside the box at the top and bottom', () => {
    expect(tooltipPosition(50, 5, tip, host).top).toBe(0);
    expect(tooltipPosition(50, 199, tip, host).top).toBe(160);
  });

  it('never goes left of the box', () => {
    expect(tooltipPosition(5, 100, { width: 300, height: 40 }, { width: 200, height: 200 }).left).toBe(0);
  });
});
