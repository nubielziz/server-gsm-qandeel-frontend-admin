// The fixed cast of the System health mock: core components and gateways, queues, scheduled jobs, the metrics an alert
// rule can watch and the staff the stories name. Plain tables; the builders turn them into DTOs. Dev and tests only.
import type { ComponentKind, MeasureUnit, StaffRef } from '../types';
import { HOUR, DAY, MINUTE } from './clock';

/** The staff members the stories name (the ids and names of the access mock's seeded accounts). */
export const STAFF = {
  rami: { id: 1, name: 'Rami K.' },
  omar: { id: 3, name: 'Omar T.' },
  dana: { id: 4, name: 'Dana M.' },
} as const satisfies Record<string, StaffRef>;

// ---- Components ----

export type ComponentSpec = {
  key: string;
  name: string;
  kind: ComponentKind;
  /** Calm response time of the check, and the limits applied to it. */
  calm: number;
  warn: number;
  crit: number;
  id?: number;
};

export const CORE: ComponentSpec[] = [
  { key: 'api', name: 'API', kind: 'core', calm: 38, warn: 300, crit: 1000 },
  { key: 'postgres', name: 'Postgres', kind: 'core', calm: 4, warn: 100, crit: 500 },
  { key: 'redis', name: 'Redis', kind: 'core', calm: 2, warn: 50, crit: 250 },
  { key: 'storage', name: 'File storage', kind: 'core', calm: 120, warn: 800, crit: 2000 },
  { key: 'workers', name: 'Queue workers', kind: 'core', calm: 30, warn: 200, crit: 1000 },
  { key: 'mail', name: 'Email relay', kind: 'core', calm: 310, warn: 1500, crit: 4000 },
];

/** The two payment gateways of the settings mock (ids 1 and 2). */
export const GATEWAYS: ComponentSpec[] = [
  { key: 'gateway:1', name: 'Card gateway', kind: 'gateway', id: 1, calm: 420, warn: 1500, crit: 4000 },
  { key: 'gateway:2', name: 'Crypto gateway', kind: 'gateway', id: 2, calm: 560, warn: 1500, crit: 4000 },
];

/** Limits of a supplier's `accountinfo` check, and each seeded supplier's calm response time (by supplier id). */
export const SUPPLIER_LIMITS = { warn: 2000, crit: 5000 };
export const SUPPLIER_CALM_MS: Record<number, number> = { 1: 310, 2: 420, 3: 540, 4: 640, 5: 520, 6: 880 };

// ---- Queues ----

export type QueueSpec = {
  name: string;
  waiting: number;
  active: number;
  delayed: number;
  workers: number;
  rate: number;
  /** Age of the oldest waiting job, in seconds. */
  age: number;
};

export const QUEUES: QueueSpec[] = [
  { name: 'orders.dispatch', waiting: 3, active: 2, delayed: 4, workers: 4, rate: 38, age: 4 },
  { name: 'orders.fetch', waiting: 11, active: 3, delayed: 28, workers: 3, rate: 61, age: 7 },
  { name: 'supplier.sync', waiting: 0, active: 1, delayed: 6, workers: 2, rate: 4, age: 0 },
  { name: 'notifications', waiting: 5, active: 2, delayed: 0, workers: 2, rate: 52, age: 3 },
  { name: 'webhooks.out', waiting: 8, active: 3, delayed: 14, workers: 3, rate: 44, age: 6 },
  { name: 'ledger.jobs', waiting: 1, active: 1, delayed: 0, workers: 2, rate: 23, age: 2 },
  { name: 'risk.assess', waiting: 0, active: 0, delayed: 0, workers: 1, rate: 9, age: 0 },
  { name: 'reports.export', waiting: 0, active: 0, delayed: 0, workers: 1, rate: 1, age: 0 },
];

/** Where the counters go once the trouble has set in (only the queues that change are listed). */
export const QUEUE_STRESS: Record<'degraded' | 'outage', Record<string, Partial<Omit<QueueSpec, 'name'>>>> = {
  degraded: {
    'orders.dispatch': { waiting: 64, active: 8, delayed: 41, age: 192, rate: 12 },
    'orders.fetch': { waiting: 29, delayed: 55, age: 48, rate: 40 },
    'webhooks.out': { waiting: 40, age: 95 },
  },
  outage: {
    'orders.dispatch': { waiting: 412, active: 0, age: 840, rate: 0, workers: 1 },
    'orders.fetch': { waiting: 233, active: 0, age: 905, rate: 0, workers: 1 },
    'ledger.jobs': { waiting: 188, active: 0, age: 710, rate: 0 },
    'webhooks.out': { waiting: 96, age: 305, rate: 6 },
    notifications: { waiting: 22, age: 19 },
  },
};

/** Failed jobs kept per queue, by part of the story. */
export const FAILED_COUNTS: Record<'calm' | 'slow' | 'outage' | 'ledger', Record<string, number>> = {
  calm: { 'orders.fetch': 2, 'webhooks.out': 3, notifications: 1 },
  slow: { 'orders.dispatch': 23, 'orders.fetch': 9, 'webhooks.out': 4 },
  outage: { 'orders.dispatch': 61, 'orders.fetch': 34, 'ledger.jobs': 27, 'webhooks.out': 18 },
  ledger: { 'ledger.jobs': 1, 'webhooks.out': 3 },
};

/** Failure texts and subjects a queue's failed jobs are made from, by part of the story. */
export const FAILURES: Record<
  'calm' | 'slow' | 'outage',
  Record<string, { reason: string; subject: string }[]>
> = {
  calm: {
    'orders.fetch': [{ reason: 'Supplier answered 502 (Bad Gateway)', subject: 'order #' }],
    'webhooks.out': [
      { reason: 'Connection refused: https://hooks.merchant.example/gsm', subject: 'delivery #' },
    ],
    notifications: [{ reason: 'Telegram: 429 Too Many Requests (retry after 3 s)', subject: 'message #' }],
    'ledger.jobs': [{ reason: 'Entry rejected: its lines do not sum to zero', subject: 'entry #' }],
  },
  slow: {
    'orders.dispatch': [{ reason: 'Supplier timeout after 6000 ms (Rapid IMEI)', subject: 'order #' }],
    'orders.fetch': [{ reason: 'Supplier timeout after 6000 ms (Rapid IMEI)', subject: 'order #' }],
    'webhooks.out': [{ reason: 'Request timed out after 10000 ms', subject: 'delivery #' }],
  },
  outage: {
    'orders.dispatch': [{ reason: 'connect ECONNREFUSED 10.0.3.12:5432', subject: 'order #' }],
    'orders.fetch': [{ reason: 'FATAL: sorry, too many clients already', subject: 'order #' }],
    'ledger.jobs': [{ reason: 'Connection terminated unexpectedly', subject: 'entry #' }],
    'webhooks.out': [{ reason: 'connect ECONNREFUSED 10.0.3.12:5432', subject: 'delivery #' }],
  },
};

// ---- Scheduled jobs ----

export type JobSpec = {
  name: string;
  label: string;
  schedule: string;
  text: string;
  /** Period and offset inside it (both ms), to find the last and next scheduled time. */
  every: number;
  offset: number;
  /** A typical run: how long it takes and how many items it handles. */
  typical: number;
  processed: number;
};

export const JOBS: JobSpec[] = [
  {
    name: 'price_sync',
    label: 'Supplier price sync',
    schedule: '*/15 * * * *',
    text: 'Every 15 minutes',
    every: 15 * MINUTE,
    offset: 0,
    typical: 21_000,
    processed: 1480,
  },
  {
    name: 'supplier_balance',
    label: 'Supplier balance check',
    schedule: '*/30 * * * *',
    text: 'Every 30 minutes',
    every: 30 * MINUTE,
    offset: 0,
    typical: 4_200,
    processed: 6,
  },
  {
    name: 'reminders',
    label: 'Reminders and alert follow-ups',
    schedule: '*/10 * * * *',
    text: 'Every 10 minutes',
    every: 10 * MINUTE,
    offset: 0,
    typical: 1_300,
    processed: 12,
  },
  {
    name: 'fx_refresh',
    label: 'FX rates refresh',
    schedule: '5 * * * *',
    text: 'Every hour at :05',
    every: HOUR,
    offset: 5 * MINUTE,
    typical: 900,
    processed: 7,
  },
  {
    name: 'accruals',
    label: 'Commission accruals',
    schedule: '0 1 * * *',
    text: 'Every day at 01:00 UTC',
    every: DAY,
    offset: HOUR,
    typical: 38_000,
    processed: 214,
  },
  {
    name: 'ledger_integrity',
    label: 'Ledger integrity check',
    schedule: '30 2 * * *',
    text: 'Every day at 02:30 UTC',
    every: DAY,
    offset: 2.5 * HOUR,
    typical: 14_200,
    processed: 48_213,
  },
  {
    name: 'data_retention',
    label: 'Expired data cleanup',
    schedule: '0 3 * * *',
    text: 'Every day at 03:00 UTC',
    every: DAY,
    offset: 3 * HOUR,
    typical: 96_000,
    processed: 1830,
  },
];

// ---- Alert rules ----

/** The metrics a rule can watch, and the unit each is measured in (the server knows this; the console sends the key). */
export const METRIC_UNITS: Record<string, MeasureUnit | null> = {
  'supplier.timeout_rate': 'percent',
  'supplier.error_rate': 'percent',
  'supplier.balance': null,
  'api.p95': 'ms',
  'api.rate5xx': 'percent',
  'queue.oldest_age': 's',
  'orders.past_sla': 'count',
  'ledger.mismatch_count': 'count',
  'db.connection_usage': 'percent',
  'redis.memory_usage': 'percent',
  'webhooks.success_rate': 'percent',
};
