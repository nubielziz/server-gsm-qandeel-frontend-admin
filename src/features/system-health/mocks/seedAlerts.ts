// Seed of the alerts the System health mock's rules fired: a month of resolved history, and the alerts that are open
// in each scenario (slow supplier, database down, ledger mismatch). Times are relative to the seeding. Dev and tests only.
import type { AlertEvent, AlertRule, StaffRef } from '../types';
import { DAY, HOUR, MINUTE, iso } from './clock';
import { SLOW_SUPPLIER_ID, SLOW_SUPPLIER_NAME, type Profile } from './profile';
import { refOf } from './seedRules';
import { STAFF } from './specs';

type Subject = { type: string; id: number; label: string | null };
const SYSTEM: Subject = { type: 'system', id: 0, label: null };
const supplier = (id: number, label: string): Subject => ({ type: 'supplier', id, label });
const queue = (label: string): Subject => ({ type: 'queue', id: 0, label });

type AlertSeed = {
  rule: string;
  subject: Subject;
  value: number;
  /** When it fired and how long it lasted; no length means it is still open. */
  startedAgo: number;
  lasted?: number;
  /** Acknowledged this long after it fired. */
  ackAfter?: number;
  ackBy?: StaffRef;
  note?: string;
};

// Resolved alerts of the last month, newest first here (the seed reverses them so ids grow with time).
const HISTORY: AlertSeed[] = [
  {
    rule: 'api_p95_latency',
    subject: SYSTEM,
    value: 1720,
    startedAgo: 2 * DAY + 6 * HOUR,
    lasted: 11 * MINUTE,
  },
  {
    rule: 'queue_oldest_job',
    subject: queue('orders.fetch'),
    value: 214,
    startedAgo: 3 * DAY + HOUR,
    lasted: 7 * MINUTE,
  },
  {
    rule: 'supplier_timeout_rate',
    subject: supplier(2, 'Gulf Server Hub'),
    value: 27.5,
    startedAgo: 6 * DAY + 14 * HOUR,
    lasted: 22 * MINUTE,
    ackAfter: 4 * MINUTE,
    ackBy: STAFF.dana,
    note: 'Supplier is rate limiting us; they confirmed a fix.',
  },
  {
    rule: 'supplier_balance_low',
    subject: supplier(2, 'Gulf Server Hub'),
    value: 118.2,
    startedAgo: 8 * DAY,
    lasted: 2 * HOUR + 40 * MINUTE,
  },
  {
    rule: 'webhook_failures',
    subject: SYSTEM,
    value: 91.8,
    startedAgo: 10 * DAY + 3 * HOUR,
    lasted: 33 * MINUTE,
  },
  { rule: 'api_rate5xx', subject: SYSTEM, value: 3.1, startedAgo: 12 * DAY + 9 * HOUR, lasted: 9 * MINUTE },
  {
    rule: 'db_connections',
    subject: SYSTEM,
    value: 93,
    startedAgo: 15 * DAY + 2 * HOUR,
    lasted: 14 * MINUTE,
  },
  {
    rule: 'orders_past_sla',
    subject: SYSTEM,
    value: 26,
    startedAgo: 17 * DAY + 11 * HOUR,
    lasted: 38 * MINUTE,
  },
  {
    rule: 'supplier_timeout_rate',
    subject: supplier(6, 'Bosphorus Unlock'),
    value: 21.8,
    startedAgo: 21 * DAY + 5 * HOUR,
    lasted: 17 * MINUTE,
  },
  {
    rule: 'ledger_mismatch',
    subject: { type: 'ledger_account', id: 87, label: 'Wallet · Zain Mobile Hub' },
    value: 1,
    startedAgo: 27 * DAY + 4 * HOUR,
    lasted: 3 * HOUR + 5 * MINUTE,
    ackAfter: 12 * MINUTE,
    ackBy: STAFF.omar,
    note: 'Reversing entry posted in Finance.',
  },
];

// The alerts that are open in a scenario.
function openSeeds(profile: Profile): AlertSeed[] {
  const open: AlertSeed[] = [];
  if (profile.slowSupplier) {
    open.push(
      {
        rule: 'supplier_timeout_rate',
        subject: supplier(SLOW_SUPPLIER_ID, SLOW_SUPPLIER_NAME),
        value: 23.4,
        startedAgo: 35 * MINUTE,
      },
      { rule: 'queue_oldest_job', subject: queue('orders.dispatch'), value: 192, startedAgo: 22 * MINUTE },
    );
  }
  if (profile.dbDown) {
    open.push(
      { rule: 'db_connections', subject: SYSTEM, value: 100, startedAgo: 13 * MINUTE },
      { rule: 'api_rate5xx', subject: SYSTEM, value: 18.4, startedAgo: 12 * MINUTE },
      { rule: 'queue_oldest_job', subject: queue('orders.fetch'), value: 905, startedAgo: 9 * MINUTE },
    );
  }
  if (profile.ledgerMismatch) {
    open.push({
      rule: 'ledger_mismatch',
      subject: { type: 'ledger_account', id: 214, label: 'Wallet · Basra Unlock Center' },
      value: 1,
      startedAgo: 43 * MINUTE,
      ackAfter: 13 * MINUTE,
      ackBy: STAFF.dana,
      note: 'Checking the Basra Unlock Center wallet. Checkout is paused meanwhile.',
    });
  }
  return open;
}

function toAlert(seed: AlertSeed, rules: AlertRule[], anchor: number): Omit<AlertEvent, 'id'> {
  const rule = rules.find((candidate) => candidate.key === seed.rule);
  if (!rule) throw new Error(`Unknown alert rule ${seed.rule}`);
  const startedAt = anchor - seed.startedAgo;
  const acknowledgedAt = seed.ackAfter === undefined ? null : startedAt + seed.ackAfter;
  const resolvedAt = seed.lasted === undefined ? null : startedAt + seed.lasted;
  return {
    ruleId: rule.id,
    value: seed.value,
    subjectType: seed.subject.type,
    subjectId: seed.subject.id,
    startedAt: iso(startedAt),
    acknowledgedAt: acknowledgedAt === null ? null : iso(acknowledgedAt),
    resolvedAt: resolvedAt === null ? null : iso(resolvedAt),
    status: resolvedAt !== null ? 'resolved' : acknowledgedAt !== null ? 'acknowledged' : 'firing',
    severity: rule.severity,
    rule: refOf(rule),
    subjectLabel: seed.subject.label,
    acknowledgedBy: seed.ackBy ?? null,
    note: seed.note ?? null,
    incidentId: null,
  };
}

/** The resolved history first (oldest first, so ids grow with time), then the alerts open in this scenario. */
export function seedAlerts(profile: Profile, anchor: number, rules: AlertRule[]): Omit<AlertEvent, 'id'>[] {
  return [...[...HISTORY].reverse(), ...openSeeds(profile)].map((seed) => toAlert(seed, rules, anchor));
}
