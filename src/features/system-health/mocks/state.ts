// The state the System health mock keeps: the tables that writes change (rules, alerts, incidents, queues, runs,
// maintenance) and what the scenario made of them. It is seeded on first use and again whenever the scenario
// changes, and `resetHealthState` (the mock's `reset`) drops it. Dev and tests only.
import type { Collection } from '@/mocks/db';
import { mockScenario, type MockScenario } from '@/mocks/scenario';
import type {
  AlertEvent,
  AlertRule,
  FailedJob,
  Incident,
  IntegrityCheck,
  JobRun,
  MaintenanceState,
} from '../types';
import type { Profile } from './profile';
import { seedState } from './seed';

/** A queue's live switches: paused or not, and jobs a retry put back to waiting a moment ago. */
export type QueueRuntime = {
  name: string;
  paused: boolean;
  pausedAt: number | null;
  retries: { at: number; count: number }[];
};

export type HealthState = {
  scenario: MockScenario;
  profile: Profile;
  /** When the state was seeded. The stories ("38 minutes ago") are told relative to it. */
  anchor: number;
  maintenance: MaintenanceState;
  rules: Collection<AlertRule>;
  alerts: Collection<AlertEvent>;
  incidents: Collection<Incident>;
  queues: Map<string, QueueRuntime>;
  /** Failed jobs per queue, newest first. */
  failed: Map<string, FailedJob[]>;
  runs: Collection<JobRun>;
  /** Runs that have started: when each will finish, and whether it will find the ledger put right (settled by the next read). */
  pending: Map<number, { at: number; fixed: boolean }>;
  /** The four ledger checks as of the last finished integrity run, and the last time they all passed. */
  checks: IntegrityCheck[];
  lastSuccessAt: string | null;
};

let current: HealthState | undefined;

/** The state for the scenario in effect; a new scenario seeds a new state. */
export function healthState(): HealthState {
  const scenario = mockScenario();
  if (current?.scenario !== scenario) current = seedState(scenario, Date.now());
  return current;
}

/** Drops the state so the next use seeds it again (tests call this after each test). */
export function resetHealthState(): void {
  current = undefined;
}
