// Silk ribbons for the sign-in background (docs/login-design.md): each sheet is a band of thin strands that twists
// along a curved centre line and is shaded like cloth. Pure drawing code: it needs only a 2D context, and the same
// seed always draws the same picture. The WebGL painter (silkGl.ts) runs the same model on the GPU, so the shading
// constants below are shared with it.

export type Rgb = readonly [number, number, number];
export type Point = readonly [number, number];

/** How one theme colours and lights the silk (read from the `--wave-*` tokens). */
export interface SilkPalette {
  colors: readonly Rgb[];
  /** Light left on cloth that faces away from the light, 0–1. Higher reads paler and calmer. */
  ambient: number;
  /** Strength of the sheen where the cloth faces the light, 0–1. */
  sheen: number;
  /** CSS colour of the thin line along each ribbon edge, which keeps the edge crisp against the page. */
  edge: string;
  /** The page colour behind the artwork: sheets with `fade` lean towards it, so they read as further away. */
  page: Rgb;
}

/** One ribbon. Positions are in the composition's unit box (0–1, x right, y down); sizes in shares of its shorter side. */
export interface SilkSheet {
  /** Cubic Bézier control points of the centre line. */
  path: readonly [Point, Point, Point, Point];
  /** Half the ribbon's width. */
  width: number;
  /** Slow swell of the width: amount (0–1), waves along the ribbon, phase. */
  swell: readonly [number, number, number];
  /** Sideways drift of the centre line: amount, waves along the ribbon, phase. */
  wobble: readonly [number, number, number];
  /** Twist around the centre line in radians: base, swing, waves, phase. The cloth folds where it passes ±90°. */
  twist: readonly [number, number, number, number];
  /** Palette indexes along the ribbon, start to end. */
  colors: readonly number[];
  /** Palette index of the back of the cloth, seen after a fold. */
  back: number;
  /** How many strands make the ribbon. */
  strands: number;
  /** How far the sheet's colour leans towards the page, 0–1: a little depth for sheets further back. */
  fade?: number;
}

/** Where the unit box lands on the canvas, in CSS pixels. */
export interface SilkFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A sheet ready to draw: per strand, x/y pairs along the ribbon and an r/g/b colour at each point. */
export interface SheetGeometry {
  slices: number;
  points: Float32Array[];
  colors: Uint8ClampedArray[];
  /** Distance between neighbouring strands at each slice, which sets the stroke width. */
  spacing: Float32Array;
}

const TAU = Math.PI * 2;
/** How far strands slide along the flow as the cloth turns: it gives each fold depth instead of a flat pinch. */
export const SHEAR = 0.42;
/** The cross-section is gently curved, so the light changes across the width: soft interiors, defined edges. */
export const BOW = 0.6;
/** Strand segments drawn as one gradient stroke: fewer draw calls, colour still changes smoothly. */
const RUN = 6;
/** Colour of the sheen: a warm white, so highlights read as light on silk rather than as paint. */
export const WARM_WHITE: Rgb = [255, 247, 232];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

// Light from the top left, slightly in front; the half vector between it and the viewer drives the sheen.
export const LIGHT = normalize(-0.42, -0.62, 0.66);
export const HALF = normalize(LIGHT[0], LIGHT[1], LIGHT[2] + 1);

/** A small seeded random generator (mulberry32), so the fibre pattern is the same on every visit. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bezier(path: SilkSheet['path'], t: number): [number, number] {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * path[0][0] + b * path[1][0] + c * path[2][0] + d * path[3][0],
    a * path[0][1] + b * path[1][1] + c * path[2][1] + d * path[3][1],
  ];
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** The colour at `t` (0–1) along a list of palette colours, mixed in sRGB. */
function colorAlong(stops: readonly Rgb[], t: number): [number, number, number] {
  const clamped = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(clamped));
  const f = clamped - index;
  const a = stops[index];
  const b = stops[index + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/** Unit tangents of a polyline by central differences (one-sided at the ends). */
function tangents(xy: Float32Array, count: number): Float32Array {
  const out = new Float32Array(count * 2);
  for (let i = 0; i < count; i += 1) {
    const a = Math.max(0, i - 1);
    const b = Math.min(count - 1, i + 1);
    const dx = xy[b * 2] - xy[a * 2];
    const dy = xy[b * 2 + 1] - xy[a * 2 + 1];
    const length = Math.hypot(dx, dy) || 1;
    out[i * 2] = dx / length;
    out[i * 2 + 1] = dy / length;
  }
  return out;
}

/**
 * Lays one sheet out on the canvas: the centre line (Bézier plus a slow sideways wobble), then each strand across the
 * twisted width, with a shaded colour at every point. Shading treats the cloth as a surface turning around its centre
 * line: diffuse light, a broad sheen and a narrow glint where it faces the light, and the `back` colour after a fold.
 */
export function buildSheet(sheet: SilkSheet, frame: SilkFrame, palette: SilkPalette): SheetGeometry {
  const unit = Math.min(frame.width, frame.height);
  const toPx = (p: [number, number]): [number, number] => [
    frame.x + p[0] * frame.width,
    frame.y + p[1] * frame.height,
  ];

  // Enough slices for a smooth curve: one every ~5px of the centre line's length.
  let length = 0;
  let previous = toPx(bezier(sheet.path, 0));
  for (let k = 1; k <= 32; k += 1) {
    const next = toPx(bezier(sheet.path, k / 32));
    length += Math.hypot(next[0] - previous[0], next[1] - previous[1]);
    previous = next;
  }
  const slices = Math.min(320, Math.max(90, Math.round(length / 5)));
  const count = slices + 1;

  const base = new Float32Array(count * 2);
  for (let i = 0; i < count; i += 1) {
    const [x, y] = toPx(bezier(sheet.path, i / slices));
    base[i * 2] = x;
    base[i * 2 + 1] = y;
  }
  const baseTangent = tangents(base, count);
  const centre = new Float32Array(count * 2);
  for (let i = 0; i < count; i += 1) {
    const u = i / slices;
    const drift = sheet.wobble[0] * unit * Math.sin(TAU * sheet.wobble[1] * u + sheet.wobble[2]);
    centre[i * 2] = base[i * 2] - baseTangent[i * 2 + 1] * drift;
    centre[i * 2 + 1] = base[i * 2 + 1] + baseTangent[i * 2] * drift;
  }
  const tangent = tangents(centre, count);

  const halfWidth = new Float32Array(count);
  const twist = new Float32Array(count);
  const spacing = new Float32Array(count);
  const strands = Math.max(2, sheet.strands);
  for (let i = 0; i < count; i += 1) {
    const u = i / slices;
    halfWidth[i] =
      sheet.width * unit * (1 + sheet.swell[0] * Math.sin(TAU * sheet.swell[1] * u + sheet.swell[2]));
    twist[i] = sheet.twist[0] + sheet.twist[1] * Math.sin(TAU * sheet.twist[2] * u + sheet.twist[3]);
    const c = Math.cos(twist[i]);
    const s = SHEAR * Math.sin(twist[i]);
    spacing[i] = ((2 * halfWidth[i]) / (strands - 1)) * Math.sqrt(c * c + s * s);
  }

  const stops = sheet.colors.map((index) => palette.colors[index] ?? palette.colors[0]);
  const fade = sheet.fade ?? 0;
  const back = palette.colors[sheet.back] ?? palette.colors[0];
  const points: Float32Array[] = [];
  const colors: Uint8ClampedArray[] = [];

  for (let j = 0; j < strands; j += 1) {
    const v = -1 + (2 * j) / (strands - 1);
    const xy = new Float32Array(count * 2);
    const rgb = new Uint8ClampedArray(count * 3);
    // Strands near the edge sit a little in shadow, so the ribbon reads as having thickness.
    const rim = 1 - 0.14 * smoothstep(0.8, 1, Math.abs(v));
    for (let i = 0; i < count; i += 1) {
      const tx = tangent[i * 2];
      const ty = tangent[i * 2 + 1];
      const across = halfWidth[i] * Math.cos(twist[i]) * v;
      const along = halfWidth[i] * Math.sin(twist[i]) * v * SHEAR;
      xy[i * 2] = centre[i * 2] - ty * across + tx * along;
      xy[i * 2 + 1] = centre[i * 2 + 1] + tx * across + ty * along;

      // Surface normal of cloth turned by `theta` around the tangent: (ty sinθ, -tx sinθ, cosθ).
      const theta = twist[i] + BOW * v;
      const sin = Math.sin(theta);
      let nx = ty * sin;
      let ny = -tx * sin;
      let nz = Math.cos(theta);
      let color = colorAlong(stops, i / slices + 0.06 * v);
      let dim = rim;
      if (nz < 0) {
        // The back of the cloth after a fold: its own colour, a touch darker.
        nx = -nx;
        ny = -ny;
        nz = -nz;
        // Mostly the back colour: a half-way mix of two distant hues turns muddy (blue and orange make grey).
        color = [
          color[0] + (back[0] - color[0]) * 0.85,
          color[1] + (back[1] - color[1]) * 0.85,
          color[2] + (back[2] - color[2]) * 0.85,
        ];
        dim *= 0.9;
      }
      const diffuse = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      const facing = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]);
      const sheen = palette.sheen * (0.45 * facing ** 12 + 0.55 * facing ** 70);
      const light = (palette.ambient + (1 - palette.ambient) * diffuse) * dim;
      for (let c = 0; c < 3; c += 1) {
        const lit = color[c] * light + WARM_WHITE[c] * sheen;
        rgb[i * 3 + c] = lit + (palette.page[c] - lit) * fade;
      }
    }
    points.push(xy);
    colors.push(rgb);
  }
  return { slices, points, colors, spacing };
}

function rgbAt(colors: Uint8ClampedArray, i: number): string {
  return `rgb(${colors[i * 3]},${colors[i * 3 + 1]},${colors[i * 3 + 2]})`;
}

/**
 * Paints a laid-out sheet: the body as overlapping strand strokes (each short run a two-stop gradient, so colour flows
 * without thousands of draw calls), then faint light and dark fibres for the silk grain, then the two edge lines.
 */
export function drawSheet(
  context: CanvasRenderingContext2D,
  geometry: SheetGeometry,
  palette: SilkPalette,
  random: () => number,
): void {
  const { slices, points, colors, spacing } = geometry;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  points.forEach((xy, j) => {
    const rgb = colors[j];
    for (let start = 0; start < slices; start += RUN) {
      const end = Math.min(slices, start + RUN);
      context.beginPath();
      context.moveTo(xy[start * 2], xy[start * 2 + 1]);
      let gap = 0;
      for (let i = start + 1; i <= end; i += 1) {
        context.lineTo(xy[i * 2], xy[i * 2 + 1]);
        gap += spacing[i];
      }
      // Wider than the gap to the next strand, so neighbours overlap and no paper shows between them.
      context.lineWidth = Math.max(1, (gap / (end - start)) * 1.7);
      const x0 = xy[start * 2];
      const y0 = xy[start * 2 + 1];
      const x1 = xy[end * 2];
      const y1 = xy[end * 2 + 1];
      if (Math.hypot(x1 - x0, y1 - y0) < 0.5) {
        context.strokeStyle = rgbAt(rgb, start);
      } else {
        const gradient = context.createLinearGradient(x0, y0, x1, y1);
        gradient.addColorStop(0, rgbAt(rgb, start));
        gradient.addColorStop(1, rgbAt(rgb, end));
        context.strokeStyle = gradient;
      }
      context.stroke();
    }
  });

  // The grain: thin threads along some strands, a little lighter or darker than the cloth.
  context.lineWidth = 0.6;
  points.forEach((xy) => {
    const pick = random();
    if (pick > 0.62) return;
    const light = pick < 0.31;
    const alpha = light ? 0.05 + random() * 0.08 : 0.03 + random() * 0.045;
    context.strokeStyle = light
      ? `rgba(255,255,255,${alpha.toFixed(3)})`
      : `rgba(8,18,40,${alpha.toFixed(3)})`;
    context.beginPath();
    context.moveTo(xy[0], xy[1]);
    for (let i = 1; i <= slices; i += 1) context.lineTo(xy[i * 2], xy[i * 2 + 1]);
    context.stroke();
  });

  context.lineWidth = 0.9;
  context.strokeStyle = palette.edge;
  for (const xy of [points[0], points[points.length - 1]]) {
    context.beginPath();
    context.moveTo(xy[0], xy[1]);
    for (let i = 1; i <= slices; i += 1) context.lineTo(xy[i * 2], xy[i * 2 + 1]);
    context.stroke();
  }
}
