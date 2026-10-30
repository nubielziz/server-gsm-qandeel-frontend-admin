// Tests for the silk generator: the seeded random numbers and the sheet geometry are the same on every run, so the
// artwork never changes between visits.
import { describe, expect, it } from 'vitest';
import { buildSheet, seededRandom, type SilkPalette } from './silk';
import { silkFrame, SILK_SEED, SILK_SHEETS } from './silkScene';

const PALETTE: SilkPalette = {
  colors: [
    [28, 92, 171],
    [42, 120, 214],
    [27, 175, 122],
    [237, 161, 0],
    [235, 104, 52],
  ],
  page: [247, 247, 244],
  ambient: 0.62,
  sheen: 0.55,
  edge: 'rgba(16,24,40,0.16)',
};

describe('seededRandom', () => {
  it('repeats the same numbers for the same seed, in [0, 1)', () => {
    const first = seededRandom(SILK_SEED);
    const second = seededRandom(SILK_SEED);
    const a = Array.from({ length: 50 }, first);
    const b = Array.from({ length: 50 }, second);
    expect(a).toEqual(b);
    expect(a.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('gives another sequence for another seed', () => {
    const a = Array.from({ length: 5 }, seededRandom(1));
    const b = Array.from({ length: 5 }, seededRandom(2));
    expect(a).not.toEqual(b);
  });
});

describe('buildSheet', () => {
  it('builds the same strands and colours on every call', () => {
    const frame = silkFrame(1440, 900);
    const one = buildSheet(SILK_SHEETS[1], frame, PALETTE);
    const two = buildSheet(SILK_SHEETS[1], frame, PALETTE);
    expect(one.slices).toBe(two.slices);
    expect(one.points).toHaveLength(SILK_SHEETS[1].strands);
    expect(Array.from(one.points[10])).toEqual(Array.from(two.points[10]));
    expect(Array.from(one.colors[30])).toEqual(Array.from(two.colors[30]));
  });

  it('keeps one point per slice end and a usable stroke spacing', () => {
    const geometry = buildSheet(SILK_SHEETS[0], silkFrame(390, 265), PALETTE);
    expect(geometry.slices).toBeGreaterThanOrEqual(90);
    expect(geometry.slices).toBeLessThanOrEqual(320);
    expect(geometry.points[0]).toHaveLength((geometry.slices + 1) * 2);
    expect(geometry.colors[0]).toHaveLength((geometry.slices + 1) * 3);
    expect(Array.from(geometry.spacing).every((gap) => Number.isFinite(gap) && gap >= 0)).toBe(true);
  });
});
