// Loads the demo's own seed data (captured by scripts/extract-demo-seed.mjs) for the dev mock layer, with its
// timestamps moved forward so the data looks fresh. Feature mocks map these demo objects to API DTOs.

/** The demo state `S`: keys such as `orders`, `merchants`, `admins`. Shapes are the demo's, not the API's. */
export type DemoState = Record<string, unknown>;

const DAY_MS = 86_400_000;
// A number this close to the capture time is a timestamp; the demo's other numbers (money, counts) are nowhere near.
const TIMESTAMP_WINDOW_MS = 3 * 365.25 * DAY_MS;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Copies the JSON tree, rebuilds Sets and Maps, and adds `shift` to every timestamp-like number (exported for tests). */
export function decodeDemoValue(value: unknown, shift: number, capturedAt: number): unknown {
  if (typeof value === 'number') {
    return Math.abs(value - capturedAt) <= TIMESTAMP_WINDOW_MS ? value + shift : value;
  }
  if (Array.isArray(value)) return value.map((item) => decodeDemoValue(item, shift, capturedAt));
  if (isPlainObject(value)) {
    if (Array.isArray(value.__set))
      return new Set(decodeDemoValue(value.__set, shift, capturedAt) as unknown[]);
    if (Array.isArray(value.__map))
      return new Map(decodeDemoValue(value.__map, shift, capturedAt) as [unknown, unknown][]);
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, decodeDemoValue(item, shift, capturedAt)]),
    );
  }
  return value;
}

/**
 * The demo state with all timestamps rebased to now (`Date.now() - capturedAt` added to each).
 * Every call returns a fresh copy, so a feature can mutate its rows freely. The JSON is imported as raw text
 * on purpose: it stays out of the type checker and out of the main bundle.
 */
export async function loadDemoState(): Promise<DemoState> {
  const { default: raw } = await import('./demo-state.json?raw');
  const { capturedAt, state } = JSON.parse(raw) as { capturedAt: number; state: unknown };
  return decodeDemoValue(state, Date.now() - capturedAt, capturedAt) as DemoState;
}

/** A table of the demo state as typed rows (`demoRows<DemoAdmin>(state, 'admins')`). Empty when the key is missing. */
export function demoRows<T>(state: DemoState, key: string): T[] {
  const rows = state[key];
  return Array.isArray(rows) ? (rows as T[]) : [];
}

/** The numeric id behind a demo id: 'ORD-48100' is 48100, 'm6' is 6. Throws when the id ends in no digits. */
export function demoNumericId(id: string): number {
  const match = /(\d+)$/.exec(id);
  if (!match) throw new Error(`Demo id "${id}" does not end in a number.`);
  return Number(match[1]);
}

/** A number as the API's 4-decimal money string: 12.49 is '12.4900'. */
export function toMoney(amount: number): string {
  const text = amount.toFixed(4);
  return text === '-0.0000' ? '0.0000' : text;
}

/** An epoch in milliseconds as the API's ISO date-time string. */
export function toIso(ms: number): string {
  return new Date(ms).toISOString();
}
