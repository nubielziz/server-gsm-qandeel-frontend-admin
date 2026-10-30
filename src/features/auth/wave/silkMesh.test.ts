// Tests for the WebGL silk's tables: the grid and its triangles and lines, the CSS colour reader, and that the GPU and
// 2D painters give the cloth the same grain.
import { describe, expect, it } from 'vitest';
import { buildSheet, drawSheet, seededRandom, type SilkPalette } from './silk';
import { buildSheetMesh, parseRgba, POINT_SIZE } from './silkMesh';
import { silkFrame, SILK_SEED, SILK_SHEETS } from './silkScene';

describe('buildSheetMesh', () => {
  it('lays out one point per slice end on every strand, from v = -1 to 1', () => {
    const mesh = buildSheetMesh(4, seededRandom(1), 10);
    expect(mesh.points).toHaveLength(4 * 11 * POINT_SIZE);
    expect(Array.from(mesh.points.slice(0, 2))).toEqual([0, -1]);
    const last = (4 * 11 - 1) * POINT_SIZE;
    expect(Array.from(mesh.points.slice(last, last + 2))).toEqual([1, 1]);
  });

  it('covers the space between strands with triangles, strand by strand', () => {
    const mesh = buildSheetMesh(4, seededRandom(1), 10);
    expect(mesh.body).toHaveLength(3 * 10 * 6);
    expect(Array.from(mesh.body.slice(0, 6))).toEqual([0, 11, 1, 11, 12, 1]);
    // The last triangles join the last two strands.
    expect(Math.max(...mesh.body)).toBe(4 * 11 - 1);
  });

  it('draws the two outer strands as edges and only picked strands as fibres', () => {
    const mesh = buildSheetMesh(4, seededRandom(1), 10);
    expect(mesh.edges).toHaveLength(2 * 10 * 2);
    expect(Array.from(mesh.edges.slice(0, 2))).toEqual([0, 1]);
    const kinds = new Set<number>();
    for (let at = 2; at < mesh.points.length; at += POINT_SIZE) kinds.add(mesh.points[at]);
    expect([...kinds].every((kind) => [-1, 0, 1].includes(kind))).toBe(true);
    const threads = [0, 1, 2, 3].filter((j) => mesh.points[j * 11 * POINT_SIZE + 2] !== 0).length;
    expect(mesh.fibres).toHaveLength(threads * 10 * 2);
  });

  it('gives the cloth the same threads as the 2D painter', () => {
    const palette: SilkPalette = {
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
    // A stand-in 2D context that keeps the colour of every 0.6px stroke (the fibres).
    const threads2d: string[] = [];
    const context = {
      lineWidth: 1,
      strokeStyle: '' as unknown,
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {
        if (this.lineWidth === 0.6) threads2d.push(String(this.strokeStyle));
      },
      createLinearGradient: () => ({ addColorStop() {} }),
    };
    const random2d = seededRandom(SILK_SEED);
    const randomGl = seededRandom(SILK_SEED);
    const threadsGl: string[] = [];
    for (const sheet of SILK_SHEETS) {
      const geometry = buildSheet(sheet, silkFrame(1440, 900), palette);
      drawSheet(context as unknown as CanvasRenderingContext2D, geometry, palette, random2d);
      const mesh = buildSheetMesh(sheet.strands, randomGl);
      const row = mesh.points.length / POINT_SIZE / sheet.strands;
      for (let j = 0; j < sheet.strands; j += 1) {
        const kind = mesh.points[j * row * POINT_SIZE + 2];
        const alpha = mesh.points[j * row * POINT_SIZE + 3];
        if (kind === 0) continue;
        const rgb = kind > 0 ? '255,255,255' : '8,18,40';
        threadsGl.push(`rgba(${rgb},${Math.fround(alpha).toFixed(3)})`);
      }
    }
    expect(threadsGl.length).toBeGreaterThan(20);
    expect(threadsGl).toEqual(threads2d);
  });
});

describe('parseRgba', () => {
  it('reads rgba() and rgb() as 0–1 channels', () => {
    expect(parseRgba('rgba(255,255,255,0.12)')).toEqual([1, 1, 1, 0.12]);
    expect(parseRgba('rgb(0, 51, 255)')).toEqual([0, 0.2, 1, 1]);
  });

  it('is transparent for anything it cannot read', () => {
    expect(parseRgba('blue')).toEqual([0, 0, 0, 0]);
    expect(parseRgba('rgba(1,2)')).toEqual([0, 0, 0, 0]);
  });
});
