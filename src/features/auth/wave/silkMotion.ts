// The sign-in wave's slow motion: the folds of each sheet flow down the ribbon while its curve sways and its width
// breathes. Pure functions of time, so every machine shows the same frame, and time 0 is exactly the still composition.
import type { Point, SilkSheet } from './silk';

const TAU = Math.PI * 2;

/** How one sheet moves. Swings are [amount, seconds per cycle]. */
export interface SheetMotion {
  /** Seconds for the twist to travel one full wave down the ribbon: the folds flow, and loop seamlessly. */
  flow: number;
  /** Swing of the sideways wobble's phase, in radians: the centre line sways. */
  wobble: readonly [number, number];
  /** Swing of the width's phase, in radians: the ribbon breathes. */
  swell: readonly [number, number];
  /** Drift of the two inner control points, in shares of the composition box: the whole curve sways. */
  sway: readonly [number, number];
}

/**
 * Back to front, like SILK_SHEETS. On a laptop screen the folds travel about 12–20 px a second and the curves sway
 * slower still: calm enough to sit behind a form. Front sheets move a little faster, as nearer things seem to, and
 * the periods share no small common factor, so the three never fall into a visible repeating pattern.
 */
export const SILK_MOTION: readonly SheetMotion[] = [
  { flow: 70, wobble: [0.5, 23], swell: [0.35, 29], sway: [0.025, 31] },
  { flow: 55, wobble: [0.6, 19], swell: [0.4, 23], sway: [0.03, 27] },
  { flow: 44, wobble: [0.7, 17], swell: [0.5, 19], sway: [0.028, 21] },
];

/** amount × (sin(2πt / period + phase) − sin(phase)): zero at time 0, then moving at once (no slow start). */
function swing([amount, period]: readonly [number, number], seconds: number, phase = 0): number {
  return amount * (Math.sin((TAU * seconds) / period + phase) - Math.sin(phase));
}

/** Moves a point by a delta. */
function shift(point: Point, dx: number, dy: number): Point {
  return [point[0] + dx, point[1] + dy];
}

/**
 * The sheet as it stands `seconds` into the motion; at 0 it is the sheet itself. The end points stay put, so each
 * ribbon still enters and leaves the screen where the composition puts it.
 */
export function sheetAt(sheet: SilkSheet, motion: SheetMotion, seconds: number): SilkSheet {
  if (seconds === 0) return sheet;
  const sway = (phase: number) => swing(motion.sway, seconds, phase);
  const [start, first, second, end] = sheet.path;
  return {
    ...sheet,
    path: [start, shift(first, sway(0), sway(1.3)), shift(second, sway(2.1), sway(0.7)), end],
    wobble: [sheet.wobble[0], sheet.wobble[1], sheet.wobble[2] + swing(motion.wobble, seconds)],
    swell: [sheet.swell[0], sheet.swell[1], sheet.swell[2] + swing(motion.swell, seconds, 0.9)],
    // A falling phase moves the twist pattern towards the ribbon's end: the folds flow downstream.
    twist: [sheet.twist[0], sheet.twist[1], sheet.twist[2], sheet.twist[3] - (TAU * seconds) / motion.flow],
  };
}
