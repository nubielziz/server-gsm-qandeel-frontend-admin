// The answers of `GET /admin/system/health` and `GET /admin/system/checks`, made from the facts and the mock state.
// The mock plays the server: it works out the verdict, the open-alert state and every uptime figure.
import type {
  AlertEvent,
  AlertSummary,
  ChecksResponse,
  ComponentChecks,
  Incident,
  IncidentSummary,
  Measure,
  MonitoringState,
  SeriesPoint,
  SystemHealth,
  TimeRange,
} from '../types';
import { SECOND, MINUTE, bucketStarts, iso, stepOf } from './clock';
import {
  allFacts,
  latencyMeasure,
  overallStatus,
  toComponent,
  type Fact,
  type SupplierSource,
} from './facts';
import { checkBuckets, deployedAt, platformUptime } from './history';
import type { HealthState } from './state';
import { SPEC, measure } from './thresholds';

type OpenAlert = AlertEvent & { status: 'firing' | 'acknowledged' };
type OngoingIncident = Incident & { status: Exclude<Incident['status'], 'resolved'> };

/** Alerts that are firing or acknowledged (not yet resolved by the server). */
export const openAlertsOf = (state: HealthState): OpenAlert[] =>
  state.alerts.list().filter((alert): alert is OpenAlert => alert.status !== 'resolved');

/** Incidents that are not resolved. */
export const ongoingIncidentsOf = (state: HealthState): OngoingIncident[] =>
  state.incidents.list().filter((incident): incident is OngoingIncident => incident.status !== 'resolved');

function monitoringOf(state: HealthState, now: number): MonitoringState {
  if (state.profile.monitoringDown) {
    return {
      status: 'unavailable',
      detail:
        'Prometheus did not answer: connection refused (prometheus:9090). Rates and latencies cannot be checked.',
      lastScrapeAt: iso(state.anchor - 17 * MINUTE),
    };
  }
  return {
    status: 'available',
    detail: null,
    lastScrapeAt: iso(Math.floor(now / (15 * SECOND)) * 15 * SECOND),
  };
}

/** An open alert as the health summary lists it. */
const toAlertSummary = (alert: OpenAlert): AlertSummary => ({
  id: alert.id,
  ruleName: alert.rule.name,
  severity: alert.severity,
  status: alert.status,
  subjectLabel: alert.subjectLabel,
  startedAt: alert.startedAt,
});

/** An ongoing incident as the health summary lists it. */
const toIncidentSummary = (incident: OngoingIncident): IncidentSummary => ({
  id: incident.id,
  title: incident.title,
  severity: incident.severity,
  status: incident.status,
  components: incident.components,
  startedAt: incident.startedAt,
});

// Warn when any alert is open, crit when a critical one is (acknowledged or not: it is still open). When the alerts
// cannot be evaluated there is no count, and that is `unknown`, never "none".
function openMeasure(open: number, critical: number, blind: boolean): Measure {
  const state = blind ? 'unknown' : critical > 0 ? 'crit' : open > 0 ? 'warn' : 'ok';
  return { value: blind ? null : open, unit: SPEC.alertsOpen.unit, state, warn: SPEC.alertsOpen.warn };
}

// How many alerts were open at each 15-minute step of the last 24 hours, worked out from the alerts themselves.
function alertTrend(state: HealthState, now: number): SeriesPoint[] {
  const alerts = state.alerts.list();
  return bucketStarts('24h', stepOf('metrics', '24h'), now).map((at) => ({
    at: iso(at),
    value: state.profile.monitoringDown
      ? null
      : alerts.filter(
          (alert) =>
            Date.parse(alert.startedAt ?? '') <= at &&
            (alert.resolvedAt === null || Date.parse(alert.resolvedAt) > at),
        ).length,
  }));
}

// When the overall status began: the earliest broken component or open critical alert; for a healthy platform, the end
// of the last incident; with no monitoring, the last scrape that worked.
function sinceOf(
  state: HealthState,
  facts: Fact[],
  open: OpenAlert[],
  monitoring: MonitoringState,
): string | null {
  const status = overallStatus(state, facts, open);
  if (status === 'unknown') return monitoring.lastScrapeAt;
  if (status === 'operational') {
    const ended = state.incidents
      .list()
      .flatMap((incident) => (incident.resolvedAt ? [incident.resolvedAt] : []));
    return ended.sort().pop() ?? null;
  }
  const times = [
    ...facts.flatMap((fact) => (fact.trouble !== null && fact.since !== null ? [fact.since] : [])),
    ...open
      .filter((alert) => alert.severity === 'critical')
      .map((alert) => Date.parse(alert.startedAt ?? '')),
  ];
  return times.length > 0 ? iso(Math.min(...times)) : null;
}

/** `GET /admin/system/health`. */
export function buildSystemHealth(
  state: HealthState,
  suppliers: SupplierSource[],
  now: number,
): SystemHealth {
  const facts = allFacts(state, suppliers);
  const open = openAlertsOf(state);
  const critical = open.filter((alert) => alert.severity === 'critical').length;
  const monitoring = monitoringOf(state, now);
  return {
    status: overallStatus(state, facts, open),
    since: sinceOf(state, facts, open, monitoring),
    checkedAt: iso(now),
    monitoring,
    build: {
      version: 'v1.42.0',
      commit: '9c4e1fa',
      environment: 'production',
      deployedAt: iso(deployedAt(state)),
    },
    components: facts.map((fact) => toComponent(fact, now)),
    uptime: platformUptime(state, now),
    alerts: {
      open: openMeasure(open.length, critical, state.profile.monitoringDown),
      critical,
      items: state.profile.monitoringDown ? [] : open.map(toAlertSummary),
      trend: alertTrend(state, now),
    },
    incidents: ongoingIncidentsOf(state).map(toIncidentSummary),
    maintenance: { ...state.maintenance },
  };
}

/** `GET /admin/system/checks` for the chosen components (all of them when none is chosen). */
export function buildChecks(
  state: HealthState,
  facts: Fact[],
  range: TimeRange,
  now: number,
): ChecksResponse {
  const deployed = deployedAt(state);
  const components = facts.map((fact): ComponentChecks => {
    const buckets = checkBuckets(fact, range, now, deployed);
    const checks = buckets.reduce((sum, bucket) => sum + bucket.checks, 0);
    const failures = buckets.reduce((sum, bucket) => sum + bucket.failures, 0);
    return {
      key: fact.key,
      name: fact.name,
      uptime: measure(SPEC.uptime, checks === 0 ? null : (1 - failures / checks) * 100),
      latency: latencyMeasure(fact, now),
      buckets,
    };
  });
  return { range, bucketSeconds: stepOf('checks', range) / SECOND, components };
}
