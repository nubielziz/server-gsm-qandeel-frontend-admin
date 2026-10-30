// Tests for the sign-in wave's scene: reading the palette from theme tokens, the frames for wide screens and phones,
// and that every sheet only names colours the palette has.
import { describe, expect, it } from 'vitest';
import { parseRgbToken, readSilkPalette, silkFrame, SILK_SHEETS, SILK_WIDE_FROM } from './silkScene';

/** A computed-style stand-in that answers from a plain map. */
function styleOf(tokens: Record<string, string>) {
  return { getPropertyValue: (name: string) => tokens[name] ?? '' };
}

describe('parseRgbToken', () => {
  it('reads "r g b" and "r, g, b", and falls back to black on anything else', () => {
    expect(parseRgbToken(' 28 92 171 ')).toEqual([28, 92, 171]);
    expect(parseRgbToken('1, 2, 3')).toEqual([1, 2, 3]);
    expect(parseRgbToken('')).toEqual([0, 0, 0]);
    expect(parseRgbToken('blue')).toEqual([0, 0, 0]);
    expect(parseRgbToken('1 2')).toEqual([0, 0, 0]);
  });
});

describe('readSilkPalette', () => {
  it('reads the five wave colours, the page colour, the light and a dark hairline on paper', () => {
    const palette = readSilkPalette(
      styleOf({
        '--wave-1': '28 92 171',
        '--wave-2': '42 120 214',
        '--wave-3': '27 175 122',
        '--wave-4': '237 161 0',
        '--wave-5': '235 104 52',
        '--bg': '247 247 244',
        '--wave-ambient': '0.62',
        '--wave-sheen': ' 0.55',
      }),
    );
    expect(palette.colors).toHaveLength(5);
    expect(palette.colors[0]).toEqual([28, 92, 171]);
    expect(palette.colors[4]).toEqual([235, 104, 52]);
    expect(palette.page).toEqual([247, 247, 244]);
    expect(palette.ambient).toBe(0.62);
    expect(palette.sheen).toBe(0.55);
    expect(palette.edge).toBe('rgba(16,24,40,0.16)');
  });

  it('uses a light hairline on the dark theme and falls back when tokens are missing', () => {
    const dark = readSilkPalette(styleOf({ '--wave-ambient': '0.38' }));
    expect(dark.edge).toBe('rgba(255,255,255,0.12)');
    const empty = readSilkPalette(styleOf({}));
    expect(empty.ambient).toBe(0.6);
    expect(empty.sheen).toBe(0.5);
    expect(empty.colors.every((color) => color.join() === '0,0,0')).toBe(true);
  });
});

describe('silkFrame', () => {
  it('puts the composition on the right of wide screens, bleeding off the top and the right edge', () => {
    const frame = silkFrame(1440, 900);
    expect(frame.x).toBeGreaterThan(1440 * 0.3);
    expect(frame.y).toBeLessThan(0);
    expect(frame.x + frame.width).toBeGreaterThan(1440);
  });

  it('fills the phone band right of the wordmark and crops it on the right', () => {
    const frame = silkFrame(SILK_WIDE_FROM - 1, 260);
    expect(frame.x).toBeGreaterThan(0);
    expect(frame.x).toBeLessThan((SILK_WIDE_FROM - 1) * 0.2);
    expect(frame.x + frame.width).toBeGreaterThan(SILK_WIDE_FROM - 1);
  });
});

describe('SILK_SHEETS', () => {
  it('only names colours of the five-colour palette, and has strands to draw', () => {
    for (const sheet of SILK_SHEETS) {
      for (const index of [...sheet.colors, sheet.back]) expect(index).toBeGreaterThanOrEqual(0);
      for (const index of [...sheet.colors, sheet.back]) expect(index).toBeLessThan(5);
      expect(sheet.strands).toBeGreaterThan(1);
      expect(sheet.path).toHaveLength(4);
    }
  });
});
