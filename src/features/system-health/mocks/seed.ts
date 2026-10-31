// Builds the System health mock state for a scenario: the rules, alerts, incidents, queues and runs each scenario
// tells, and the maintenance switch. Pure apart from the clock value it is given.
import { Collection } from '@/mocks/db';
import type { MockScenario } from '@/mocks/scenario';
import type { AlertEvent, AlertRule, Incident, JobRun, MaintenanceState } from '../types';
import { HOUR, MINUTE, iso } from './clock';
import { profileOf, type Profile } from './profile';
import { seedAlerts } from './seedAlerts';
import { seedIncidents } from './seedIncidents';
import { lastCleanRun, seedChecks } from './seedIntegrity';
import { seedFailed, seedQueues, seedRuns } from './seedOps';
import { seedRules } from './seedRules';
import { STAFF } from './specs';
import type { HealthState } from './state';

function maintenanceOf(profile: Profile, anchor: number): MaintenanceState {
  if (!profile.maintenance) {
    return {
      enabled: false,
      scope: null,
      message: null,
      expectedEndAt: null,
      startedAt: null,
      startedBy: null,
    };
  }
  return {
    enabled: true,
    scope: 'checkout',
    message: 'Checkout is paused while we check a wallet difference. We will be back shortly.',
    expectedEndAt: iso(anchor + 2 * HOUR),
    startedAt: iso(anchor - 25 * MINUTE),
    startedBy: STAFF.dana,
  };
}

/** The open incident was declared from the first open critical alert: each points at the other. */
function linkIncident(alerts: Collection<AlertEvent>, incidents: Collection<Incident>): void {
  const incident = incidents.list().find((candidate) => candidate.status !== 'resolved');
  const alert = alerts
    .list()
    .find((candidate) => candidate.status !== 'resolved' && candidate.severity === 'critical');
  if (!incident || !alert) return;
  incident.alertEventId = alert.id;
  alert.incidentId = incident.id;
}

export function seedState(scenario: MockScenario, anchor: number): HealthState {
  const profile = profileOf(scenario);

  const rules = new Collection<AlertRule>();
  for (const rule of seedRules(anchor)) rules.insert(rule);
  const alerts = new Collection<AlertEvent>();
  for (const alert of seedAlerts(profile, anchor, rules.list())) alerts.insert(alert);
  const incidents = new Collection<Incident>();
  for (const incident of seedIncidents(profile, anchor)) incidents.insert(incident);
  linkIncident(alerts, incidents);

  const runs = new Collection<JobRun>();
  for (const run of seedRuns(profile, anchor)) runs.insert(run);

  return {
    scenario,
    profile,
    anchor,
    maintenance: maintenanceOf(profile, anchor),
    rules,
    alerts,
    incidents,
    queues: seedQueues(),
    failed: seedFailed(profile, anchor),
    runs,
    pending: new Map(),
    checks: seedChecks(profile.ledgerMismatch, anchor),
    lastSuccessAt: lastCleanRun(runs.list())?.finishedAt ?? null,
  };
}
