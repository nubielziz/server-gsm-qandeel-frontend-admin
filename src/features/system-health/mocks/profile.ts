// What each mock scenario (`?mock=<name>`, see src/mocks/scenario.ts) changes in the world the mock plays: which things
// are broken, since when, which reads answer an error and whether the staff member may write. One table, read by
// every builder, so a scenario is one row and not a switch spread over the files.
import type { MockScenario } from '@/mocks/scenario';
import { problem } from '@/mocks/problem';
import { MINUTE } from './clock';

/** Reads that can be made to fail, each with the answer the real server would give. */
export type GateKey = 'metrics' | 'errors' | 'queues' | 'ordersHealth' | 'integrity';

const GATES: Record<GateKey, () => Response> = {
  metrics: () =>
    problem(
      503,
      'MONITORING_UNAVAILABLE',
      'Monitoring unavailable',
      'Prometheus did not answer (connection refused). Charts return when it does.',
    ),
  errors: () =>
    problem(
      503,
      'MONITORING_UNAVAILABLE',
      'Monitoring unavailable',
      'Sentry and Prometheus did not answer. The error list returns when they do.',
    ),
  queues: () =>
    problem(500, 'INTERNAL_ERROR', 'Something went wrong', 'The queue counters could not be read.'),
  ordersHealth: () =>
    problem(
      503,
      'DATABASE_UNAVAILABLE',
      'Database unavailable',
      'The database is not accepting connections.',
    ),
  integrity: () =>
    problem(
      503,
      'DATABASE_UNAVAILABLE',
      'Database unavailable',
      'The database is not accepting connections.',
    ),
};

/** The answer for a gate that is closed in this profile, or null when the read works. */
export function gateAnswer(profile: Profile, key: GateKey): Response | null {
  return profile.gates.includes(key) ? GATES[key]() : null;
}

/** How bad the platform itself is, as the data tells it (the verdict also depends on monitoring and alerts). */
export type Tone = 'ok' | 'degraded' | 'outage';

export type Profile = {
  scenario: MockScenario;
  tone: Tone;
  /** Minutes before the state was seeded that the trouble began; null when there is none. */
  troubleMin: number | null;
  /** The metrics backend does not answer: nothing that depends on it can be called healthy. */
  monitoringDown: boolean;
  /** One supplier answers in seconds and times out. */
  slowSupplier: boolean;
  /** Postgres refuses connections. */
  dbDown: boolean;
  /** A merchant wallet does not match its ledger lines. */
  ledgerMismatch: boolean;
  /** Checkout maintenance is on from the start. */
  maintenance: boolean;
  /** The staff member has read access only: every write answers 403. */
  readOnly: boolean;
  gates: GateKey[];
};

const CALM: Omit<Profile, 'scenario'> = {
  tone: 'ok',
  troubleMin: null,
  monitoringDown: false,
  slowSupplier: false,
  dbDown: false,
  ledgerMismatch: false,
  maintenance: false,
  readOnly: false,
  gates: [],
};

const SLOW_SUPPLIER: Omit<Profile, 'scenario'> = {
  ...CALM,
  tone: 'degraded',
  troubleMin: 38,
  slowSupplier: true,
};

const PROFILES: Record<MockScenario, Omit<Profile, 'scenario'>> = {
  healthy: CALM,
  degraded: SLOW_SUPPLIER,
  outage: { ...CALM, tone: 'outage', troubleMin: 14, dbDown: true, gates: ['ordersHealth', 'integrity'] },
  'monitoring-down': { ...CALM, monitoringDown: true, gates: ['metrics', 'errors'] },
  'partial-failure': { ...CALM, gates: ['queues'] },
  maintenance: { ...CALM, tone: 'degraded', troubleMin: 43, ledgerMismatch: true, maintenance: true },
  readonly: { ...SLOW_SUPPLIER, readOnly: true },
};

/** The profile of a scenario. */
export function profileOf(scenario: MockScenario): Profile {
  return { scenario, ...PROFILES[scenario] };
}

/** When the trouble of a profile began (ms), given the moment its state was seeded; null when there is none. */
export const onsetOf = (profile: Profile, anchor: number): number | null =>
  profile.troubleMin === null ? null : anchor - profile.troubleMin * MINUTE;

/** The merchant whose wallet the ledger-mismatch story is about ("Basra Unlock Center" in the merchants mock). */
export const MISMATCH_CLIENT_ID = 4;

/** The supplier the slow-supplier story is about (a seeded supplier of the suppliers mock). */
export const SLOW_SUPPLIER_ID = 3;
export const SLOW_SUPPLIER_NAME = 'Rapid IMEI';
