// Seed of the alert rules of the System health mock: ten rules (a mix of critical and warning, one muted, one switched
// off). The first two come from the map's `system-alert` and `system-integrity` scenarios. Dev and tests only.
import type {
  AlertChannel,
  AlertComparator,
  AlertRule,
  AlertRuleRef,
  AlertSeverity,
  MeasureUnit,
} from '../types';
import { DAY, HOUR, iso } from './clock';

type RuleSeed = {
  key: string;
  name: string;
  metric: string;
  comparator: AlertComparator;
  threshold: number;
  windowSeconds: number;
  severity: AlertSeverity;
  channels: AlertChannel[];
  unit: MeasureUnit | null;
  createdDaysAgo: number;
  isActive?: boolean;
  /** Muted for this many more hours. */
  mutedHours?: number;
};

const RULES: RuleSeed[] = [
  {
    key: 'supplier_timeout_rate',
    name: 'Supplier timeouts',
    metric: 'supplier.timeout_rate',
    comparator: 'gt',
    threshold: 20,
    windowSeconds: 180,
    severity: 'critical',
    channels: ['telegram', 'email'],
    unit: 'percent',
    createdDaysAgo: 160,
  },
  {
    key: 'ledger_mismatch',
    name: 'Ledger mismatch',
    metric: 'ledger.mismatch_count',
    comparator: 'gt',
    threshold: 0,
    windowSeconds: 60,
    severity: 'critical',
    channels: ['telegram', 'email'],
    unit: 'count',
    createdDaysAgo: 160,
  },
  {
    key: 'api_rate5xx',
    name: 'API 5xx rate',
    metric: 'api.rate5xx',
    comparator: 'gt',
    threshold: 2,
    windowSeconds: 300,
    severity: 'critical',
    channels: ['telegram', 'email'],
    unit: 'percent',
    createdDaysAgo: 140,
  },
  {
    key: 'api_p95_latency',
    name: 'API p95 latency',
    metric: 'api.p95',
    comparator: 'gt',
    threshold: 1500,
    windowSeconds: 300,
    severity: 'warning',
    channels: ['telegram'],
    unit: 'ms',
    createdDaysAgo: 140,
  },
  {
    key: 'queue_oldest_job',
    name: 'Oldest queued job',
    metric: 'queue.oldest_age',
    comparator: 'gt',
    threshold: 120,
    windowSeconds: 120,
    severity: 'warning',
    channels: ['telegram'],
    unit: 's',
    createdDaysAgo: 120,
  },
  {
    key: 'orders_past_sla',
    name: 'Orders past SLA',
    metric: 'orders.past_sla',
    comparator: 'gt',
    threshold: 20,
    windowSeconds: 300,
    severity: 'critical',
    channels: ['telegram', 'email'],
    unit: 'count',
    createdDaysAgo: 120,
  },
  {
    key: 'db_connections',
    name: 'Database connections',
    metric: 'db.connection_usage',
    comparator: 'gt',
    threshold: 90,
    windowSeconds: 120,
    severity: 'critical',
    channels: ['telegram', 'email'],
    unit: 'percent',
    createdDaysAgo: 100,
  },
  {
    key: 'supplier_balance_low',
    name: 'Supplier balance low',
    metric: 'supplier.balance',
    comparator: 'lt',
    threshold: 150,
    windowSeconds: 3600,
    severity: 'warning',
    channels: ['email'],
    unit: null,
    createdDaysAgo: 90,
    mutedHours: 20,
  },
  {
    key: 'redis_memory',
    name: 'Redis memory',
    metric: 'redis.memory_usage',
    comparator: 'gt',
    threshold: 85,
    windowSeconds: 300,
    severity: 'warning',
    channels: ['telegram'],
    unit: 'percent',
    createdDaysAgo: 60,
    isActive: false,
  },
  {
    key: 'webhook_failures',
    name: 'Webhook delivery',
    metric: 'webhooks.success_rate',
    comparator: 'lt',
    threshold: 95,
    windowSeconds: 600,
    severity: 'warning',
    channels: ['email'],
    unit: 'percent',
    createdDaysAgo: 45,
  },
];

/** The rules, with ids 1 to 10 in the order above. */
export function seedRules(anchor: number): Omit<AlertRule, 'id'>[] {
  return RULES.map((rule) => ({
    key: rule.key,
    name: rule.name,
    metric: rule.metric,
    comparator: rule.comparator,
    threshold: rule.threshold,
    windowSeconds: rule.windowSeconds,
    severity: rule.severity,
    channels: rule.channels,
    unit: rule.unit,
    isActive: rule.isActive ?? true,
    mutedUntil: rule.mutedHours ? iso(anchor + rule.mutedHours * HOUR) : null,
    open: false,
    createdAt: iso(anchor - rule.createdDaysAgo * DAY),
    updatedAt: null,
  }));
}

/** The compact copy of a rule an alert carries, so a list needs no second call. */
export function refOf(rule: AlertRule): AlertRuleRef {
  const { id, key, name, metric, comparator, threshold, windowSeconds, unit } = rule;
  return { id, key, name, metric, comparator, threshold, windowSeconds, unit };
}
