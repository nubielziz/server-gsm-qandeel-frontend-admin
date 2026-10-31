// Words, tones and icons for every status the System health page shows, so one status reads the same on every card.
// No demo screen: the tones follow the verdict rules of docs/system-health-design.md (good, warn, crit, neutral).
import type { BadgeTone, IconName } from '@/components/ui';
import type {
  AlertSeverity,
  AlertStatus,
  CheckStatus,
  CircuitState,
  IncidentSeverity,
  IncidentStatus,
  IntegrityStatus,
  JobRunStatus,
  MetricState,
  OverallStatus,
} from '../types';

/** Any status the page shows as a badge: the overall verdict, a component check, a measure's state, or a paused switch. */
export type HealthStatus = OverallStatus | CheckStatus | MetricState | 'paused';

/** How one status is drawn. Status is never colour alone, so every status has a word and an icon next to its tone. */
export interface StatusMeta {
  tone: BadgeTone;
  icon: IconName;
  word: string;
  /** What it means in plain words, for a tooltip. Only set where the word alone is not clear (circuit states). */
  hint?: string;
}

// The tables below share one scheme where they can: good = check, warn = triangle, crit = x, neutral = i. A word with a
// better icon (paused, firing, an open circuit) gets its own. "No data" and "unknown" are neutral on purpose: never green.
const HEALTH: Record<HealthStatus, StatusMeta> = {
  operational: { tone: 'good', icon: 'checkCircle', word: 'Operational' },
  ok: { tone: 'good', icon: 'checkCircle', word: 'OK' },
  degraded: { tone: 'warn', icon: 'alert', word: 'Degraded' },
  warn: { tone: 'warn', icon: 'alert', word: 'Warn' },
  outage: { tone: 'crit', icon: 'xCircle', word: 'Outage' },
  down: { tone: 'crit', icon: 'xCircle', word: 'Down' },
  crit: { tone: 'crit', icon: 'xCircle', word: 'Critical' },
  paused: { tone: 'neutral', icon: 'pause', word: 'Paused' },
  unknown: { tone: 'neutral', icon: 'info', word: 'Unknown' },
};

const ALERT_SEVERITY: Record<AlertSeverity, StatusMeta> = {
  info: { tone: 'neutral', icon: 'info', word: 'Info' },
  warning: { tone: 'warn', icon: 'alert', word: 'Warning' },
  critical: { tone: 'crit', icon: 'xCircle', word: 'Critical' },
};

// Firing is orange (serious) so a warning-level alert is not drawn red; the severity badge beside it carries the level.
const ALERT_STATUS: Record<AlertStatus, StatusMeta> = {
  firing: { tone: 'serious', icon: 'bell', word: 'Firing' },
  acknowledged: { tone: 'neutral', icon: 'check', word: 'Acknowledged' },
  resolved: { tone: 'good', icon: 'checkCircle', word: 'Resolved' },
};

const INCIDENT_SEVERITY: Record<IncidentSeverity, StatusMeta> = {
  minor: { tone: 'warn', icon: 'alert', word: 'Minor' },
  major: { tone: 'serious', icon: 'alert', word: 'Major' },
  critical: { tone: 'crit', icon: 'xCircle', word: 'Critical' },
};

const INCIDENT_STATUS: Record<IncidentStatus, StatusMeta> = {
  investigating: { tone: 'serious', icon: 'search', word: 'Investigating' },
  identified: { tone: 'warn', icon: 'info', word: 'Identified' },
  monitoring: { tone: 'neutral', icon: 'pulse', word: 'Monitoring' },
  resolved: { tone: 'good', icon: 'checkCircle', word: 'Resolved' },
};

const CIRCUIT: Record<CircuitState, StatusMeta> = {
  closed: {
    tone: 'good',
    icon: 'checkCircle',
    word: 'Closed',
    hint: 'Calls to the supplier go through normally.',
  },
  open: { tone: 'crit', icon: 'ban', word: 'Open', hint: 'Calls are stopped after repeated failures.' },
  half_open: {
    tone: 'warn',
    icon: 'refresh',
    word: 'Half open',
    hint: 'A few calls are let through to test the supplier.',
  },
};

const JOB_RUN: Record<JobRunStatus, StatusMeta> = {
  running: { tone: 'neutral', icon: 'loader', word: 'Running' },
  succeeded: { tone: 'good', icon: 'checkCircle', word: 'Succeeded' },
  failed: { tone: 'crit', icon: 'xCircle', word: 'Failed' },
  skipped: { tone: 'neutral', icon: 'ban', word: 'Skipped' },
};

const INTEGRITY: Record<IntegrityStatus, StatusMeta> = {
  pass: { tone: 'good', icon: 'checkCircle', word: 'Pass' },
  fail: { tone: 'crit', icon: 'xCircle', word: 'Fail' },
  unknown: { tone: 'neutral', icon: 'info', word: 'Not checked' },
};

/**
 * Looks a key up in a table. The contract is assumed, so the server may send a value we do not know: it then shows as
 * a neutral badge with the raw text, never as green and never as a crash.
 */
function lookup<K extends string>(table: Record<K, StatusMeta>, key: K): StatusMeta {
  return Object.hasOwn(table, key) ? table[key] : { tone: 'neutral', icon: 'info', word: String(key) };
}

/** Tone, icon and word of an overall status, a component check, a measure's state or `paused`. */
export function statusMeta(status: HealthStatus): StatusMeta {
  return lookup(HEALTH, status);
}

/** Same as `statusMeta`, typed for a measure's state (the small icon beside a value, the KPI badge). */
export function metricStateMeta(state: MetricState): StatusMeta {
  return lookup(HEALTH, state);
}

export function alertSeverityMeta(severity: AlertSeverity): StatusMeta {
  return lookup(ALERT_SEVERITY, severity);
}

export function alertStatusMeta(status: AlertStatus): StatusMeta {
  return lookup(ALERT_STATUS, status);
}

export function incidentSeverityMeta(severity: IncidentSeverity): StatusMeta {
  return lookup(INCIDENT_SEVERITY, severity);
}

export function incidentStatusMeta(status: IncidentStatus): StatusMeta {
  return lookup(INCIDENT_STATUS, status);
}

/** A supplier's circuit breaker: closed (calls flow), open (calls stopped), half open (testing). Carries a hint. */
export function circuitMeta(state: CircuitState): StatusMeta {
  return lookup(CIRCUIT, state);
}

/** How the last run of a scheduled job ended. */
export function jobRunMeta(status: JobRunStatus): StatusMeta {
  return lookup(JOB_RUN, status);
}

/** The result of one ledger integrity check. */
export function integrityMeta(status: IntegrityStatus): StatusMeta {
  return lookup(INTEGRITY, status);
}

// Full class names so Tailwind's scanner can see them. Used for the small state icon beside a value.
const TONE_TEXT: Record<BadgeTone, string> = {
  good: 'text-good-fg',
  warn: 'text-warn-fg',
  serious: 'text-serious-fg',
  crit: 'text-crit-fg',
  neutral: 'text-ink3',
  accent: 'text-accent-ink',
};

/** Text colour class of a tone, for an icon that sits outside a Badge. */
export function toneTextClass(tone: BadgeTone): string {
  return TONE_TEXT[tone];
}

// 0 is the worst. Unknown comes before paused and ok: a number nobody can read is a reason to look, not a pass.
const PROBLEM_RANK: Record<HealthStatus, number> = {
  outage: 0,
  down: 0,
  crit: 0,
  degraded: 1,
  warn: 1,
  unknown: 2,
  paused: 3,
  operational: 4,
  ok: 4,
};

/** Where a status sits when problems come first: 0 critical, 1 warning, 2 unknown, 3 paused, 4 healthy. */
export function problemRank(status: HealthStatus): number {
  return Object.hasOwn(PROBLEM_RANK, status) ? PROBLEM_RANK[status] : PROBLEM_RANK.unknown;
}

/** Comparator for Array.sort: the worse status first. Equal statuses keep their order (the sort is stable). */
export function compareStatus(a: HealthStatus, b: HealthStatus): number {
  return problemRank(a) - problemRank(b);
}

/** A copy of the list with the worst items first. It orders by the status the server sent and decides nothing. */
export function sortProblemsFirst<T>(items: readonly T[], status: (item: T) => HealthStatus): T[] {
  return [...items].sort((a, b) => compareStatus(status(a), status(b)));
}
