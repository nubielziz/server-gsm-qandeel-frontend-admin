// "How was this priced?" built from the order's own `pricingSnapshot`. The demo's `trace` action opened the Services
// page's price resolver, which re-prices with today's rules; the API stores what the resolver decided at order time, so
// the console shows that (MISMATCHES M29). The snapshot is free-form JSON (assumed contract); nothing here is required.
import type { JsonObject } from '@/lib/api';
import { money, pct } from '@/lib/format';

/** How a step took part: it decided the price (`win`), changed it (`apply`), was passed over (`skip`) or was not set. */
export type StepState = 'win' | 'apply' | 'skip' | 'none';

export type TraceStep = {
  id: string;
  label: string;
  state: StepState;
  /** A price, or a fraction for the category rule and the group discount (as the demo's resolver drew them). */
  value: number | null;
  /** The running price after the step. */
  after: number | null;
  note: string;
};

export type PricingTrace = {
  /** `base`, `group`, `client` or `retail`. */
  source: string | null;
  steps: TraceStep[];
  floor: number | null;
  /** True when the price was raised to the floor (cost plus the minimum profit). */
  clamped: boolean;
  /** Other plain values of the snapshot, so a snapshot without steps still shows something. */
  extras: [label: string, value: string][];
};

/** The price sources in words (the demo's `sources` map in orderDrawer). */
export const PRICE_SOURCE_LABEL: Readonly<Record<string, string>> = {
  base: 'Base price',
  group: 'Group price',
  client: 'Client override',
  retail: 'Storefront price',
};

const STATES: readonly StepState[] = ['win', 'apply', 'skip', 'none'];
const KNOWN_KEYS = new Set(['source', 'steps', 'floor', 'clamped']);

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function readStep(raw: unknown, index: number): TraceStep | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const step = raw as Record<string, unknown>;
  const state = STATES.find((candidate) => candidate === step.state) ?? 'none';
  const id = typeof step.id === 'string' ? step.id : `step-${index}`;
  return {
    id,
    label: typeof step.label === 'string' ? step.label : id,
    state,
    value: asNumber(step.value),
    after: asNumber(step.after),
    note: typeof step.note === 'string' ? step.note : '',
  };
}

/** Reads the snapshot defensively: unknown shapes give an empty trace, never an error. */
export function pricingTrace(snapshot: JsonObject | null | undefined): PricingTrace {
  const data = snapshot ?? {};
  const steps = (Array.isArray(data.steps) ? data.steps : [])
    .map(readStep)
    .filter((step): step is TraceStep => step !== null);
  const extras = Object.entries(data)
    .filter(([key, value]) => !KNOWN_KEYS.has(key) && ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]): [string, string] => [key, String(value)]);
  return {
    source: typeof data.source === 'string' ? data.source : null,
    steps,
    floor: asNumber(data.floor),
    clamped: data.clamped === true,
    extras,
  };
}

/** The figure a step shows on the right, as the demo's resolver wrote it. Skipped steps show nothing, except the struck-through base price. */
export function stepValueText(step: TraceStep): string {
  if (step.value === null) return '';
  if (step.state === 'skip') return step.id === 'base' ? money(step.value) : '';
  if (step.id === 'category') return `${step.value > 0 ? '+' : '−'}${pct(Math.abs(step.value) * 100, 0)}`;
  if (step.id === 'discount') return `−${pct(step.value * 100, 0)}`;
  return money(step.value);
}
