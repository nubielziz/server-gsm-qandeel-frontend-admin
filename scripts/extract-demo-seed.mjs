// Runs the demo's own data files in a Node `vm` and writes the resulting state `S` to
// src/mocks/seed/demo-state.json, so the dev mock layer (decision 014) can serve the demo's data.
// Usage: npm run seed:extract  [-- --now=2026-01-01T12:00:00Z]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const demoDir = resolve(root, 'reference/gsm-admin/src/js');
const outFile = resolve(root, 'src/mocks/seed/demo-state.json');

// Same order the demo's build concatenates them in; later files read what earlier ones declared.
const FILES = ['00-util', '09-b2c-data', '10-data', '11-state', '12-state-b2c', '14-state-access'];

// The demo seeds everything relative to "now". A fixed clock makes the output byte-for-byte
// repeatable, so re-running the script only changes the JSON when the demo's data code changes.
const DEFAULT_NOW = '2026-01-01T12:00:00Z';
const nowArg = process.argv.find((a) => a.startsWith('--now='))?.slice('--now='.length) ?? DEFAULT_NOW;
const NOW = Date.parse(nowArg);
if (Number.isNaN(NOW)) {
  console.error(`Invalid --now value: ${nowArg}`);
  process.exit(1);
}

/** A stand-in for browser objects the data files mention but never really need at load time. */
function inertProxy() {
  const target = function () {};
  const handler = {
    get: (_t, key) => (key === Symbol.toPrimitive ? () => '' : inertProxy()),
    apply: () => inertProxy(),
    construct: () => inertProxy(),
    set: () => true,
  };
  return new Proxy(target, handler);
}

function createContext() {
  const noop = () => 0;
  const storage = { getItem: () => null, setItem: noop, removeItem: noop, clear: noop };
  const sandbox = {
    document: inertProxy(),
    window: inertProxy(),
    navigator: { userAgent: 'node', language: 'en-US', clipboard: inertProxy() },
    localStorage: storage,
    sessionStorage: storage,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    location: { href: 'http://localhost/', hash: '', search: '', pathname: '/', origin: 'http://localhost' },
    // Timers are no-ops: the demo schedules UI refreshes we do not want to run.
    setTimeout: () => 0,
    setInterval: () => 0,
    clearTimeout: noop,
    clearInterval: noop,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: noop,
    console: { log: noop, warn: noop, error: noop, info: noop, debug: noop },
  };
  const context = vm.createContext(sandbox);
  // Freeze the clock inside the sandbox (`new Date()` and `Date.now()` both return NOW).
  vm.runInContext(
    `(() => {
      const Real = Date;
      class FrozenDate extends Real {
        constructor(...args) { if (args.length === 0) super(${NOW}); else super(...args); }
        static now() { return ${NOW}; }
      }
      globalThis.Date = FrozenDate;
    })();`,
    context,
  );
  return context;
}

/**
 * JSON replacer: Sets and Maps (which JSON would turn into `{}`) become tagged arrays.
 * The type check uses Object.prototype.toString because the sandbox has its own Set/Map classes.
 */
function replacer(_key, value) {
  const tag = Object.prototype.toString.call(value);
  if (tag === '[object Set]') return { __set: [...value] };
  if (tag === '[object Map]') return { __map: [...value] };
  if (typeof value === 'function') return undefined;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value;
}

const code = FILES.map((name) => readFileSync(resolve(demoDir, `${name}.js`), 'utf8')).join('\n;\n');
const context = createContext();
vm.runInContext(code, context, { filename: 'demo-bundle.js' });
const state = vm.runInContext('S', context);

// One line per top-level key: small file, and a data change shows up as a readable diff.
const body = Object.entries(state)
  .map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value, replacer)}`)
  .join(',\n');
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `{"capturedAt":${NOW},"state":{\n${body}\n}}\n`);

const keys = Object.keys(state);
console.log(`Wrote ${outFile}`);
console.log(`capturedAt ${new Date(NOW).toISOString()}, ${keys.length} top-level keys: ${keys.join(', ')}`);
