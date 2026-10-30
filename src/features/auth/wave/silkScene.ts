// The sign-in wave's composition (docs/login-design.md): three silk sheets, where their box sits on wide screens and on
// phones, and the palette of the current theme read from the `--wave-*` tokens.
import type { Rgb, SilkFrame, SilkPalette, SilkSheet } from './silk';

/** Seed of the fibre pattern. Change it only to pick a different grain on purpose. */
export const SILK_SEED = 0x2a78d6;

/** Below this width the artwork becomes a band across the top of the page. */
export const SILK_WIDE_FROM = 768;

/**
 * Back to front: a wide, faded warm sheet (amber to orange), the cool main ribbon (deep blue, blue, teal) that passes the
 * card's right edge, and a narrow warm ribbon that crosses it. Neighbouring stops never pair distant hues, because a
 * blend of blue and orange, or green and amber, turns muddy.
 */
export const SILK_SHEETS: readonly SilkSheet[] = [
  {
    path: [
      [0.4, -0.16],
      [0.5, 0.16],
      [0.84, 0.12],
      [1.12, 0.46],
    ],
    width: 0.12,
    swell: [0.25, 0.8, 0.6],
    wobble: [0.03, 1.1, 0.2],
    twist: [0.25, 1.4, 1.1, 0.9],
    colors: [3, 4],
    back: 4,
    strands: 64,
    fade: 0.3,
  },
  {
    path: [
      [0.22, -0.12],
      [0.12, 0.38],
      [0.78, 0.42],
      [1.12, 1.02],
    ],
    width: 0.105,
    swell: [0.3, 1.2, 0.4],
    wobble: [0.045, 1.4, 0.9],
    twist: [0.3, 1.7, 1.15, 0.2],
    colors: [0, 1, 2],
    back: 2,
    strands: 72,
  },
  {
    path: [
      [0.05, 0],
      [0.48, 0.26],
      [0.3, 0.78],
      [1.02, 1.1],
    ],
    width: 0.045,
    swell: [0.35, 1.6, 2.1],
    wobble: [0.03, 2, 1.7],
    twist: [0.5, 2.2, 1.6, 2.4],
    colors: [4, 3],
    back: 3,
    strands: 48,
  },
];

/**
 * Where the composition's unit box lands on a canvas of this size. Wide screens: the right two-thirds, bleeding off
 * the top and right edges so the cloth is cropped by the viewport. Phones: the canvas is the band itself.
 */
export function silkFrame(width: number, height: number): SilkFrame {
  if (width >= SILK_WIDE_FROM) {
    return { x: width * 0.34, y: -height * 0.12, width: width * 0.82, height: height * 1.24 };
  }
  // Shifted right so the wordmark in the top-left corner stays on plain paper.
  return { x: width * 0.15, y: -height * 0.36, width: width * 1.22, height: height * 1.45 };
}

/** An "r g b" token value as numbers; black when the token is missing, so a bad theme never breaks the page. */
export function parseRgbToken(value: string): Rgb {
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return parts.length === 3 && parts.every((part) => Number.isFinite(part))
    ? [parts[0], parts[1], parts[2]]
    : [0, 0, 0];
}

function numberToken(style: Pick<CSSStyleDeclaration, 'getPropertyValue'>, name: string, fallback: number) {
  const value = Number.parseFloat(style.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

/** The palette of the theme in force, from the computed style of the root element. */
export function readSilkPalette(style: Pick<CSSStyleDeclaration, 'getPropertyValue'>): SilkPalette {
  const colors = [1, 2, 3, 4, 5].map((n) => parseRgbToken(style.getPropertyValue(`--wave-${n}`)));
  const ambient = numberToken(style, '--wave-ambient', 0.6);
  return {
    colors,
    page: parseRgbToken(style.getPropertyValue('--bg')),
    ambient,
    sheen: numberToken(style, '--wave-sheen', 0.5),
    // A dark hairline on paper, a faint light one on the dark canvas.
    edge: ambient >= 0.5 ? 'rgba(16,24,40,0.16)' : 'rgba(255,255,255,0.12)',
  };
}
