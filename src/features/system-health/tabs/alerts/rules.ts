// Helpers of the Rules view and its dialogs: the choices of the rule form, the form's values and the request bodies they
// make, and the mute. Pure functions, no demo page.
import type { SelectOption } from '@/components/ui';
import type {
  AlertChannel,
  AlertComparator,
  AlertRule,
  AlertSeverity,
  CreateAlertRuleBody,
  MeasureUnit,
  UpdateAlertRuleBody,
} from '../../types';
import { toLocalInput } from '../../lib';

/** One metric a rule can watch, with the unit the threshold is measured in. */
export interface MetricDef {
  key: string;
  label: string;
  unit: MeasureUnit | null;
}

/**
 * The metrics the form offers. Assumed contract: the map says the metric comes "from a fixed list" and that the server sets
 * the unit, but names neither. These are the keys the mock plays; a rule that already uses another key keeps it as a choice.
 */
export const METRICS: readonly MetricDef[] = [
  { key: 'supplier.timeout_rate', label: 'Supplier timeout rate', unit: 'percent' },
  { key: 'supplier.error_rate', label: 'Supplier error rate', unit: 'percent' },
  { key: 'supplier.balance', label: 'Supplier balance', unit: null },
  { key: 'api.p95', label: 'API p95 latency', unit: 'ms' },
  { key: 'api.rate5xx', label: 'API 5xx rate', unit: 'percent' },
  { key: 'queue.oldest_age', label: 'Oldest queued job', unit: 's' },
  { key: 'orders.past_sla', label: 'Orders past SLA', unit: 'count' },
  { key: 'ledger.mismatch_count', label: 'Ledger mismatches', unit: 'count' },
  { key: 'db.connection_usage', label: 'Database connections', unit: 'percent' },
  { key: 'redis.memory_usage', label: 'Redis memory', unit: 'percent' },
  { key: 'webhooks.success_rate', label: 'Webhook success rate', unit: 'percent' },
];

// How the unit of a metric reads in the threshold hint ("In %", "In seconds").
const UNIT_WORD: Record<MeasureUnit, string> = {
  percent: '%',
  ms: 'milliseconds',
  s: 'seconds',
  per_min: 'per minute',
  count: 'a plain count',
  bytes: 'bytes',
};

/** The unit of a metric for the threshold hint ("%", "seconds"); a metric without a unit, or one we do not know, has none. */
export function unitHint(metric: string): string | null {
  const unit = METRICS.find((candidate) => candidate.key === metric)?.unit;
  return unit ? UNIT_WORD[unit] : null;
}

/**
 * The choices plus the rule's own value when it is not among them. The contract is assumed, so a rule may carry a metric,
 * comparator or severity the form does not know: it stays a choice, as the server sent it, instead of vanishing from the select.
 */
export function withCurrent(options: readonly SelectOption[], current?: string): SelectOption[] {
  if (!current || options.some((option) => option.value === current)) return [...options];
  return [...options, { value: current, label: current }];
}

/** The metric select: a first "Choose a metric" line, then each metric with its key. The rule's own metric is always a choice. */
export function metricOptions(current?: string): SelectOption[] {
  return withCurrent(
    [
      { value: '', label: 'Choose a metric' },
      ...METRICS.map((metric) => ({ value: metric.key, label: `${metric.label} (${metric.key})` })),
    ],
    current,
  );
}

/** The comparison choices of the rule form, with their signs. */
export const COMPARATOR_OPTIONS: readonly SelectOption[] = [
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'gte', label: 'At least (≥)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'lte', label: 'At most (≤)' },
];

/** The severity choices of the rule form. */
export const RULE_SEVERITY_OPTIONS: readonly SelectOption[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

/** The channels a rule can send to. */
export const CHANNEL_OPTIONS: readonly { value: AlertChannel; label: string }[] = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'email', label: 'Email' },
];

/** The rule form as the fields hold it: numbers are text until they are sent. */
export interface RuleValues {
  name: string;
  key: string;
  metric: string;
  comparator: AlertComparator;
  threshold: string;
  windowSeconds: string;
  severity: AlertSeverity;
  channels: AlertChannel[];
  isActive: boolean;
}

/** A new rule starts switched on, watching nothing yet; the channel and the window are the usual ones. */
export const BLANK_RULE: RuleValues = {
  name: '',
  key: '',
  metric: '',
  comparator: 'gt',
  threshold: '',
  windowSeconds: '300',
  severity: 'warning',
  channels: ['telegram'],
  isActive: true,
};

/** The form of an existing rule. */
export function ruleValues(rule: AlertRule): RuleValues {
  return {
    name: rule.name,
    key: rule.key,
    metric: rule.metric,
    comparator: rule.comparator,
    threshold: String(rule.threshold),
    windowSeconds: String(rule.windowSeconds),
    severity: rule.severity,
    channels: [...rule.channels],
    isActive: rule.isActive,
  };
}

/** The body of `POST /admin/alert-rules`. */
export function toCreateBody(values: RuleValues): CreateAlertRuleBody {
  return {
    key: values.key.trim(),
    name: values.name.trim(),
    metric: values.metric,
    comparator: values.comparator,
    threshold: Number(values.threshold),
    windowSeconds: Number(values.windowSeconds),
    severity: values.severity,
    channels: values.channels,
    isActive: values.isActive,
  };
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item) => b.includes(item));

/**
 * The body of `PATCH /admin/alert-rules/:id`: only the fields the staff member changed, so an untouched field is never
 * checked again (a legacy metric the form does not know stays as it is) and the audit log shows what was edited.
 */
export function toUpdateBody(rule: AlertRule, values: RuleValues): UpdateAlertRuleBody {
  const next = toCreateBody(values);
  const body: UpdateAlertRuleBody = {};
  if (next.key !== rule.key) body.key = next.key;
  if (next.name !== rule.name) body.name = next.name;
  if (next.metric !== rule.metric) body.metric = next.metric;
  if (next.comparator !== rule.comparator) body.comparator = next.comparator;
  if (next.threshold !== rule.threshold) body.threshold = next.threshold;
  if (next.windowSeconds !== rule.windowSeconds) body.windowSeconds = next.windowSeconds;
  if (next.severity !== rule.severity) body.severity = next.severity;
  if (!sameList(next.channels, rule.channels)) body.channels = next.channels;
  if (next.isActive !== rule.isActive) body.isActive = next.isActive;
  return body;
}

/**
 * True while the rule is muted: `mutedUntil` is a time that has not passed. The server sends no muted flag, only the time,
 * so this is the one place the console reads the clock for a rule; a past time means the mute is over.
 */
export function isMuted(rule: Pick<AlertRule, 'mutedUntil'>, now: number): boolean {
  const until = rule.mutedUntil ? Date.parse(rule.mutedUntil) : Number.NaN;
  return !Number.isNaN(until) && until > now;
}

/** Rules with an open alert come first, as the server flags them (problems first); the server's order holds otherwise. */
export function problemsFirst(rows: readonly AlertRule[]): AlertRule[] {
  return [...rows].sort((a, b) => Number(b.open) - Number(a.open));
}

/** The quick choices of the mute dialog. */
export const MUTE_PRESETS: readonly { label: string; hours: number }[] = [
  { label: '1 hour', hours: 1 },
  { label: '8 hours', hours: 8 },
  { label: '24 hours', hours: 24 },
];

/** A `datetime-local` value `hours` from `now` (the browser's time zone). */
export function localInputIn(hours: number, now: number): string {
  return toLocalInput(new Date(now + hours * 3_600_000).toISOString());
}
