// Tests for the sign-in wave's motion: time 0 is the still composition, the ends stay put, the folds loop seamlessly
// and nothing jumps from one frame to the next.
import { describe, expect, it } from 'vitest';
import { sheetAt, SILK_MOTION } from './silkMotion';
import { SILK_SHEETS } from './silkScene';

const TAU = Math.PI * 2;
const sheet = SILK_SHEETS[1];
const motion = SILK_MOTION[1];

describe('sheetAt', () => {
  it('gives every sheet a motion', () => {
    expect(SILK_MOTION).toHaveLength(SILK_SHEETS.length);
  });

  it('is the still composition at time 0', () => {
    expect(sheetAt(sheet, motion, 0)).toBe(sheet);
  });

  it('moves the curve, the wobble, the width and the folds, and nothing else', () => {
    const moved = sheetAt(sheet, motion, 7.5);
    expect(moved.path[0]).toEqual(sheet.path[0]);
    expect(moved.path[3]).toEqual(sheet.path[3]);
    expect(moved.path[1]).not.toEqual(sheet.path[1]);
    expect(moved.path[2]).not.toEqual(sheet.path[2]);
    expect(moved.wobble.slice(0, 2)).toEqual(sheet.wobble.slice(0, 2));
    expect(moved.wobble[2]).not.toBe(sheet.wobble[2]);
    expect(moved.swell[2]).not.toBe(sheet.swell[2]);
    expect(moved.twist.slice(0, 3)).toEqual(sheet.twist.slice(0, 3));
    expect(moved.twist[3]).toBeCloseTo(sheet.twist[3] - (TAU * 7.5) / motion.flow);
    expect([moved.width, moved.strands, moved.colors, moved.back, moved.fade]).toEqual([
      sheet.width,
      sheet.strands,
      sheet.colors,
      sheet.back,
      sheet.fade,
    ]);
  });

  it('lets the folds come round to where they started after one flow period', () => {
    const later = sheetAt(sheet, motion, motion.flow);
    expect(later.twist[3]).toBeCloseTo(sheet.twist[3] - TAU);
  });

  it('changes only a little from one frame to the next (30 frames a second)', () => {
    for (const seconds of [0, 3, 11.2, 40]) {
      const a = sheetAt(sheet, motion, seconds);
      const b = sheetAt(sheet, motion, seconds + 1 / 30);
      for (const k of [1, 2] as const) {
        expect(Math.abs(a.path[k][0] - b.path[k][0])).toBeLessThan(0.001);
        expect(Math.abs(a.path[k][1] - b.path[k][1])).toBeLessThan(0.001);
      }
      expect(Math.abs(a.twist[3] - b.twist[3])).toBeLessThan(0.01);
      expect(Math.abs(a.wobble[2] - b.wobble[2])).toBeLessThan(0.01);
    }
  });
});
