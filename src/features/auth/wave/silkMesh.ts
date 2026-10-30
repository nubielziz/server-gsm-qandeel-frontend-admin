// The tables the WebGL silk is drawn from: one grid of (u, v) points per sheet, its triangles and lines, and the
// seeded fibre pattern, the same threads the 2D painter draws (silk.ts). Plain arrays, so they can be tested without
// a GPU.

/** Points along each strand. The GPU does not mind, so every sheet gets the 2D painter's finest count. */
export const MESH_SLICES = 320;

/** One sheet's grid, ready to upload. */
export interface SheetMesh {
  /** Per point, strand by strand: u (0–1 along the ribbon), v (−1–1 across it), fibre kind, fibre alpha. */
  points: Float32Array<ArrayBuffer>;
  /** Triangles between neighbouring strands, strand by strand, so later strands cover earlier ones as in 2D. */
  body: Uint16Array<ArrayBuffer>;
  /** Line segments along the strands that carry a fibre. */
  fibres: Uint16Array<ArrayBuffer>;
  /** Line segments along the two outer strands. */
  edges: Uint16Array<ArrayBuffer>;
}

/** Floats per point in `SheetMesh.points`. */
export const POINT_SIZE = 4;

/** Line segments (pairs of point indexes) along strand `j`. */
function strandLines(j: number, slices: number): number[] {
  const first = j * (slices + 1);
  const out: number[] = [];
  for (let i = 0; i < slices; i += 1) out.push(first + i, first + i + 1);
  return out;
}

/**
 * Builds a sheet's grid. `random` is the generator shared by all sheets, drawn in the 2D painter's order (per strand:
 * the pick, then the alpha of a picked one), so both painters give the cloth the same grain.
 */
export function buildSheetMesh(strands: number, random: () => number, slices = MESH_SLICES): SheetMesh {
  const count = Math.max(2, strands);
  const row = slices + 1;
  const points = new Float32Array(count * row * POINT_SIZE);
  const fibres: number[] = [];
  for (let j = 0; j < count; j += 1) {
    const v = -1 + (2 * j) / (count - 1);
    const pick = random();
    // About a third of the strands carry a light thread, a third a dark one, the rest none.
    const kind = pick > 0.62 ? 0 : pick < 0.31 ? 1 : -1;
    const alpha = kind === 0 ? 0 : kind === 1 ? 0.05 + random() * 0.08 : 0.03 + random() * 0.045;
    if (kind !== 0) fibres.push(...strandLines(j, slices));
    for (let i = 0; i < row; i += 1) {
      const at = (j * row + i) * POINT_SIZE;
      points[at] = i / slices;
      points[at + 1] = v;
      points[at + 2] = kind;
      points[at + 3] = alpha;
    }
  }
  const body = new Uint16Array((count - 1) * slices * 6);
  let k = 0;
  for (let j = 0; j < count - 1; j += 1) {
    for (let i = 0; i < slices; i += 1) {
      const a = j * row + i;
      const b = a + row;
      body.set([a, b, a + 1, b, b + 1, a + 1], k);
      k += 6;
    }
  }
  return {
    points,
    body,
    fibres: new Uint16Array(fibres),
    edges: new Uint16Array([...strandLines(0, slices), ...strandLines(count - 1, slices)]),
  };
}

/** "rgba(16,24,40,0.16)" or "rgb(…)" as 0–1 channels; transparent when it cannot be read. */
export function parseRgba(css: string): [number, number, number, number] {
  const parts = /rgba?\(([^)]+)\)/
    .exec(css)?.[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  if (!parts || parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return [0, 0, 0, 0];
  return [parts[0] / 255, parts[1] / 255, parts[2] / 255, parts[3] ?? 1];
}
