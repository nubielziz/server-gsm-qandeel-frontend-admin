// The WebGL painter of the sign-in silk: the model of silk.ts (centre line, twist, cloth shading, fibres, edges)
// computed per point on the GPU, so the cloth can move every frame for almost no CPU. A 2D frame of the same picture
// costs about 30ms of main thread, too much to animate (docs/decisions/017-sign-in-wave-webgl.md).
import {
  BOW,
  HALF,
  LIGHT,
  SHEAR,
  WARM_WHITE,
  seededRandom,
  type Rgb,
  type SilkFrame,
  type SilkPalette,
  type SilkSheet,
} from './silk';
import { buildSheetMesh, MESH_SLICES, parseRgba, POINT_SIZE } from './silkMesh';

/** A number as a GLSL float literal (GLSL ES 1.0 has no implicit int-to-float conversion). */
function float(value: number): string {
  const text = String(value);
  return /[.e]/.test(text) ? text : `${text}.0`;
}

const vec3 = (values: readonly number[]) => `vec3(${values.map(float).join(', ')})`;

/**
 * Lays out and shades one point, exactly as buildSheet in silk.ts: Bézier centre line pushed sideways by the wobble,
 * the twisted cross-section, then diffuse light, sheen and glint, the back colour after a fold, and the fade.
 * `u_pass` picks the body (0), a fibre thread (1) or the edge line (2).
 */
const VERTEX = `
precision highp float;
attribute vec2 a_uv;
attribute vec2 a_fibre;
uniform vec2 u_resolution;
uniform vec2 u_path[4];
uniform float u_unit;
uniform float u_width;
uniform vec3 u_swell;
uniform vec3 u_wobble;
uniform vec4 u_twist;
uniform vec3 u_stop0;
uniform vec3 u_stop1;
uniform vec3 u_stop2;
uniform float u_stops;
uniform vec3 u_back;
uniform float u_fade;
uniform vec3 u_page;
uniform float u_ambient;
uniform float u_sheen;
uniform vec4 u_edge;
uniform vec2 u_lineAlpha;
uniform float u_pass;
varying vec4 v_color;

const float TAU = 6.283185307179586;
const float STEP = ${float(1 / MESH_SLICES)};
const float SHEAR = ${float(SHEAR)};
const float BOW = ${float(BOW)};
const vec3 LIGHT = ${vec3(LIGHT)};
const vec3 HALFWAY = ${vec3(HALF)};
const vec3 WARM = ${vec3(WARM_WHITE.map((channel) => channel / 255))};
const vec3 DARK_THREAD = ${vec3([8 / 255, 18 / 255, 40 / 255])};

vec2 bezier(float t) {
  float s = 1.0 - t;
  return s * s * s * u_path[0] + 3.0 * s * s * t * u_path[1] + 3.0 * s * t * t * u_path[2] + t * t * t * u_path[3];
}

vec2 centre(float u) {
  vec2 dir = normalize(bezier(min(1.0, u + STEP)) - bezier(max(0.0, u - STEP)));
  float drift = u_wobble.x * u_unit * sin(TAU * u_wobble.y * u + u_wobble.z);
  return bezier(u) + vec2(-dir.y, dir.x) * drift;
}

vec3 along(float t) {
  float x = clamp(t, 0.0, 1.0) * (u_stops - 1.0);
  if (u_stops < 2.5) return mix(u_stop0, u_stop1, x);
  return x < 1.0 ? mix(u_stop0, u_stop1, x) : mix(u_stop1, u_stop2, x - 1.0);
}

void main() {
  float u = a_uv.x;
  float v = a_uv.y;
  vec2 c = centre(u);
  vec2 t = normalize(centre(min(1.0, u + STEP)) - centre(max(0.0, u - STEP)));
  float halfWidth = u_width * u_unit * (1.0 + u_swell.x * sin(TAU * u_swell.y * u + u_swell.z));
  float twist = u_twist.x + u_twist.y * sin(TAU * u_twist.z * u + u_twist.w);
  vec2 p = c + vec2(-t.y, t.x) * (halfWidth * cos(twist) * v) + t * (halfWidth * sin(twist) * v * SHEAR);
  gl_Position = vec4(p.x / u_resolution.x * 2.0 - 1.0, 1.0 - p.y / u_resolution.y * 2.0, 0.0, 1.0);

  if (u_pass > 1.5) {
    v_color = vec4(u_edge.rgb, min(1.0, u_edge.a * u_lineAlpha.y));
    return;
  }
  if (u_pass > 0.5) {
    v_color = vec4(a_fibre.x > 0.0 ? vec3(1.0) : DARK_THREAD, min(1.0, a_fibre.y * u_lineAlpha.x));
    return;
  }
  float theta = twist + BOW * v;
  float s = sin(theta);
  vec3 n = vec3(t.y * s, -t.x * s, cos(theta));
  vec3 color = along(u + 0.06 * v);
  float dim = 1.0 - 0.14 * smoothstep(0.8, 1.0, abs(v));
  if (n.z < 0.0) {
    n = -n;
    color = mix(color, u_back, 0.85);
    dim *= 0.9;
  }
  float diffuse = max(0.0, dot(n, LIGHT));
  float facing = max(0.0, dot(n, HALFWAY));
  float sheen = u_sheen * (0.45 * pow(facing, 12.0) + 0.55 * pow(facing, 70.0));
  vec3 lit = color * (u_ambient + (1.0 - u_ambient) * diffuse) * dim + WARM * sheen;
  v_color = vec4(clamp(mix(lit, u_page, u_fade), 0.0, 1.0), 1.0);
}
`;

/** Premultiplied output, so threads and edges blend over the body and the page behind the canvas. */
const FRAGMENT = `
precision mediump float;
varying vec4 v_color;
void main() {
  gl_FragColor = vec4(v_color.rgb * v_color.a, v_color.a);
}
`;

/** The 2D painter's line widths in CSS px; GL lines are one device pixel, so their alpha is scaled to match. */
const FIBRE_WIDTH = 0.6;
const EDGE_WIDTH = 0.9;

type Uniform = WebGLUniformLocation | null;

interface MeshBuffers {
  points: WebGLBuffer;
  body: { buffer: WebGLBuffer; count: number };
  fibres: { buffer: WebGLBuffer; count: number };
  edges: { buffer: WebGLBuffer; count: number };
}

interface Resources {
  program: WebGLProgram;
  uv: number;
  fibre: number;
  uniforms: Record<string, Uniform>;
  meshes: MeshBuffers[];
}

const UNIFORMS = [
  'u_resolution',
  'u_path',
  'u_unit',
  'u_width',
  'u_swell',
  'u_wobble',
  'u_twist',
  'u_stop0',
  'u_stop1',
  'u_stop2',
  'u_stops',
  'u_back',
  'u_fade',
  'u_page',
  'u_ambient',
  'u_sheen',
  'u_edge',
  'u_lineAlpha',
  'u_pass',
] as const;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

function upload(gl: WebGLRenderingContext, target: number, data: BufferSource): WebGLBuffer | null {
  const buffer = gl.createBuffer();
  if (!buffer) return null;
  gl.bindBuffer(target, buffer);
  gl.bufferData(target, data, gl.STATIC_DRAW);
  return buffer;
}

/** Compiles the program and uploads every sheet's grid. Null when the GPU refuses (the caller falls back to 2D). */
function setup(gl: WebGLRenderingContext, strands: readonly number[], seed: number): Resources | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  // One generator for all sheets, back to front, as the 2D painter draws them.
  const random = seededRandom(seed);
  const meshes: MeshBuffers[] = [];
  for (const count of strands) {
    const mesh = buildSheetMesh(count, random);
    const points = upload(gl, gl.ARRAY_BUFFER, mesh.points);
    const body = upload(gl, gl.ELEMENT_ARRAY_BUFFER, mesh.body);
    const fibres = upload(gl, gl.ELEMENT_ARRAY_BUFFER, mesh.fibres);
    const edges = upload(gl, gl.ELEMENT_ARRAY_BUFFER, mesh.edges);
    if (!points || !body || !fibres || !edges) return null;
    meshes.push({
      points,
      body: { buffer: body, count: mesh.body.length },
      fibres: { buffer: fibres, count: mesh.fibres.length },
      edges: { buffer: edges, count: mesh.edges.length },
    });
  }
  const uniforms: Record<string, Uniform> = {};
  for (const name of UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name);
  return {
    program,
    uv: gl.getAttribLocation(program, 'a_uv'),
    fibre: gl.getAttribLocation(program, 'a_fibre'),
    uniforms,
    meshes,
  };
}

/** The silk painter bound to one canvas. */
export interface SilkGl {
  /**
   * Whether a GPU draws it. False for software rendering (no GPU, a blocked driver, a virtual machine), where each
   * frame would load the CPU: the caller then shows the still picture instead of the motion.
   */
  readonly fast: boolean;
  /** Matches the drawing buffer to the canvas box (CSS px) at the given pixel ratio. Cheap when nothing changed. */
  resize(width: number, height: number, ratio: number): void;
  /** Draws the sheets as they stand, back to front. */
  draw(sheets: readonly SilkSheet[], frame: SilkFrame, palette: SilkPalette): void;
  /** Frees the GPU buffers and the program. */
  dispose(): void;
}

/**
 * Starts WebGL on `canvas` with one grid per sheet (`strands` per sheet, back to front). Returns null when WebGL is
 * missing or its program fails; in the second case the canvas cannot take a 2D context any more, so the caller needs
 * a fresh canvas for its fallback. A lost context is rebuilt when the browser restores it.
 */
export function createSilkGl(
  canvas: HTMLCanvasElement,
  strands: readonly number[],
  seed: number,
): SilkGl | null {
  const attributes: WebGLContextAttributes = {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    depth: false,
    stencil: false,
    // Decoration: never wake a laptop's discrete GPU for it.
    powerPreference: 'low-power',
  };
  // A GPU first. A refused request leaves the canvas free, so software rendering can still be asked for.
  const gl =
    canvas.getContext('webgl', { ...attributes, failIfMajorPerformanceCaveat: true }) ??
    canvas.getContext('webgl', attributes);
  if (!gl) return null;
  // Read from the context itself: on a canvas that has one already (a remount), getContext returns it whatever
  // was asked, so only its own attributes tell how it was made.
  const fast = gl.getContextAttributes()?.failIfMajorPerformanceCaveat === true;
  let resources = setup(gl, strands, seed);
  if (!resources) return null;

  let size = { width: 0, height: 0, ratio: 1 };
  const path = new Float32Array(8);
  const onLost = (event: Event) => event.preventDefault();
  const onRestored = () => {
    resources = setup(gl, strands, seed);
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  const toUnit = (rgb: Rgb): [number, number, number] => [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];

  return {
    fast,

    resize(width, height, ratio) {
      const pixelWidth = Math.max(1, Math.round(width * ratio));
      const pixelHeight = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      size = { width, height, ratio };
    },

    draw(sheets, frame, palette) {
      const r = resources;
      if (!r || gl.isContextLost() || size.width === 0) return;
      const u = r.uniforms;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(r.program);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2f(u.u_resolution, size.width, size.height);
      gl.uniform3fv(u.u_page, toUnit(palette.page));
      gl.uniform1f(u.u_ambient, palette.ambient);
      gl.uniform1f(u.u_sheen, palette.sheen);
      gl.uniform4fv(u.u_edge, parseRgba(palette.edge));
      gl.uniform2f(u.u_lineAlpha, FIBRE_WIDTH * size.ratio, EDGE_WIDTH * size.ratio);
      const unit = Math.min(frame.width, frame.height);

      sheets.forEach((sheet, index) => {
        const mesh = r.meshes[index];
        if (!mesh) return;
        sheet.path.forEach(([x, y], k) => {
          path[k * 2] = frame.x + x * frame.width;
          path[k * 2 + 1] = frame.y + y * frame.height;
        });
        // The shader takes up to three colour stops, which is all the sheets use.
        const stops = sheet.colors.slice(0, 3).map((i) => toUnit(palette.colors[i] ?? palette.colors[0]));
        gl.uniform2fv(u.u_path, path);
        gl.uniform1f(u.u_unit, unit);
        gl.uniform1f(u.u_width, sheet.width);
        gl.uniform3fv(u.u_swell, [...sheet.swell]);
        gl.uniform3fv(u.u_wobble, [...sheet.wobble]);
        gl.uniform4fv(u.u_twist, [...sheet.twist]);
        gl.uniform3fv(u.u_stop0, stops[0]);
        gl.uniform3fv(u.u_stop1, stops[1] ?? stops[0]);
        gl.uniform3fv(u.u_stop2, stops[2] ?? stops[1] ?? stops[0]);
        gl.uniform1f(u.u_stops, Math.max(2, stops.length));
        gl.uniform3fv(u.u_back, toUnit(palette.colors[sheet.back] ?? palette.colors[0]));
        gl.uniform1f(u.u_fade, sheet.fade ?? 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.points);
        for (const [location, offset] of [
          [r.uv, 0],
          [r.fibre, 8],
        ]) {
          // -1 would mean the driver dropped the attribute; there is then nothing to feed.
          if (location < 0) continue;
          gl.enableVertexAttribArray(location);
          gl.vertexAttribPointer(location, 2, gl.FLOAT, false, POINT_SIZE * 4, offset);
        }

        const passes = [
          [mesh.body, gl.TRIANGLES],
          [mesh.fibres, gl.LINES],
          [mesh.edges, gl.LINES],
        ] as const;
        passes.forEach(([part, mode], pass) => {
          if (part.count === 0) return;
          gl.uniform1f(u.u_pass, pass);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.buffer);
          gl.drawElements(mode, part.count, gl.UNSIGNED_SHORT, 0);
        });
      });
    },

    dispose() {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      const r = resources;
      resources = null;
      if (!r || gl.isContextLost()) return;
      for (const mesh of r.meshes) {
        for (const buffer of [mesh.points, mesh.body.buffer, mesh.fibres.buffer, mesh.edges.buffer]) {
          gl.deleteBuffer(buffer);
        }
      }
      gl.deleteProgram(r.program);
    },
  };
}
