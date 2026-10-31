// Mock routes of the incidents: `GET /admin/incidents` (+ `/:id`), `POST /admin/incidents` and `PATCH /admin/incidents/:id`.
// The mock writes the timeline, as the server does: declaring starts it at "investigating", every status change or update
// adds a line, and closing needs the root cause.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { problem, type ProblemError } from '@/mocks/problem';
import type { Incident, IncidentSeverity, IncidentStatus, IncidentTimelineEntry } from '../../types';
import { iso } from '../clock';
import { allFacts } from '../facts';
import { listAnswer, route, staffRef, supplierRows } from '../http';
import type { HealthState } from '../state';

const SEVERITIES: IncidentSeverity[] = ['minor', 'major', 'critical'];
const STATUSES: IncidentStatus[] = ['investigating', 'identified', 'monitoring', 'resolved'];

// The line the server writes when staff change the status without writing an update.
const DEFAULT_TEXT: Record<IncidentStatus, string> = {
  investigating: 'Back to investigating.',
  identified: 'The cause is identified.',
  monitoring: 'A fix is in place; watching it.',
  resolved: 'The incident is resolved.',
};

/** What the real server would refuse: a message per field, for the fields the body has (all required ones when creating). */
async function problemsOf(
  state: HealthState,
  body: Record<string, unknown>,
  creating: boolean,
  current?: { status: IncidentStatus },
): Promise<ProblemError[]> {
  const errors: ProblemError[] = [];
  const has = (field: string): boolean => creating || field in body;
  if (has('title') && (textOf(body.title).length < 3 || textOf(body.title).length > 120)) {
    errors.push({ field: 'title', message: 'Enter a title of 3 to 120 characters.' });
  }
  if (has('severity') && !SEVERITIES.some((candidate) => candidate === body.severity)) {
    errors.push({ field: 'severity', message: 'Choose minor, major or critical.' });
  }
  if (has('summary') && (textOf(body.summary).length < 10 || textOf(body.summary).length > 2000)) {
    errors.push({ field: 'summary', message: 'Describe what is happening in at least 10 characters.' });
  }
  if (has('components')) {
    const components = body.components;
    const known = new Set(allFacts(state, await supplierRows()).map((fact) => fact.key));
    if (!Array.isArray(components) || components.length === 0) {
      errors.push({ field: 'components', message: 'Choose at least one affected component.' });
    } else {
      const unknown = components.filter((key) => typeof key !== 'string' || !known.has(key));
      if (unknown.length > 0)
        errors.push({ field: 'components', message: `Unknown component: ${String(unknown[0])}.` });
    }
  }
  if (creating && body.alertEventId !== undefined && body.alertEventId !== null) {
    const alert = state.alerts.find(String(body.alertEventId));
    if (!alert) errors.push({ field: 'alertEventId', message: 'No such alert.' });
    else if (alert.incidentId !== null)
      errors.push({ field: 'alertEventId', message: 'This alert already has an incident.' });
  }
  if ('status' in body && !STATUSES.some((candidate) => candidate === body.status)) {
    errors.push({ field: 'status', message: 'Choose investigating, identified, monitoring or resolved.' });
  }
  if ('update' in body && textOf(body.update).length > 1000) {
    errors.push({ field: 'update', message: 'Keep the update under 1000 characters.' });
  }
  // Closing is a decision with a reason: the root cause is how the log stays useful later.
  if (
    !creating &&
    body.status === 'resolved' &&
    current?.status !== 'resolved' &&
    textOf(body.rootCause).length < 10
  ) {
    errors.push({
      field: 'rootCause',
      message: 'Enter the root cause (at least 10 characters) to close the incident.',
    });
  }
  return errors;
}

export const incidentRoutes: HttpHandler[] = [
  http.get(
    '*/admin/incidents',
    route({}, ({ state, url }) => {
      // `open=true` means every status but resolved; the generic filters handle the rest.
      const open = url.searchParams.get('open');
      const scoped = new URL(url);
      scoped.searchParams.delete('open');
      const rows = state.incidents
        .list()
        .filter((incident) =>
          open === null ? true : (incident.status !== 'resolved') === (open === 'true'),
        );
      return listAnswer(rows, scoped, { search: ['title', 'summary'], sort: 'startedAt', order: 'desc' });
    }),
  ),

  http.get(
    '*/admin/incidents/:id',
    route({}, ({ state, params }) => {
      const incident = state.incidents.find(String(params.id));
      return incident ? HttpResponse.json<Incident>(incident) : notFound('incident', params.id);
    }),
  ),

  http.post(
    '*/admin/incidents',
    route({ write: 'incidents:create' }, async ({ state, body, now }) => {
      const input = await body();
      const errors = await problemsOf(state, input, true);
      if (errors.length > 0) return invalid(errors);
      const by = await staffRef();
      const at = iso(now);
      const alertId = typeof input.alertEventId === 'number' ? input.alertEventId : null;
      const incident = state.incidents.insert({
        title: textOf(input.title),
        severity: input.severity as IncidentSeverity,
        status: 'investigating',
        components: input.components as string[],
        summary: textOf(input.summary),
        timeline: [{ at, status: 'investigating', text: 'Incident declared. We are investigating.', by }],
        rootCause: null,
        startedAt: at,
        resolvedAt: null,
        alertEventId: alertId,
        createdBy: by,
        resolvedBy: null,
        createdAt: at,
        updatedAt: at,
      });
      if (alertId !== null) state.alerts.patch(alertId, { incidentId: incident.id });
      return HttpResponse.json<Incident>(incident, { status: 201 });
    }),
  ),

  http.patch(
    '*/admin/incidents/:id',
    route({ write: 'incidents:update' }, async ({ state, params, body, now }) => {
      const incident = state.incidents.find(String(params.id));
      if (!incident) return notFound('incident', params.id);
      if (incident.status === 'resolved') {
        return problem(
          409,
          'INCIDENT_CLOSED',
          'Incident is closed',
          'A closed incident is a record and cannot be changed.',
        );
      }
      const input = await body();
      const errors = await problemsOf(state, input, false, incident);
      if (errors.length > 0) return invalid(errors);

      if (typeof input.title === 'string') incident.title = textOf(input.title);
      if (typeof input.severity === 'string') incident.severity = input.severity as IncidentSeverity;
      if (typeof input.summary === 'string') incident.summary = textOf(input.summary);
      if (Array.isArray(input.components)) incident.components = input.components as string[];
      if (typeof input.rootCause === 'string') incident.rootCause = textOf(input.rootCause) || null;

      // A new status or a written update adds a line to the timeline.
      const status = (STATUSES.find((candidate) => candidate === input.status) ??
        incident.status) as IncidentStatus;
      const update = textOf(input.update);
      if (status !== incident.status || update) {
        const by = await staffRef();
        const line: IncidentTimelineEntry = {
          at: iso(now),
          status,
          text: update || DEFAULT_TEXT[status],
          by,
        };
        incident.timeline = [...incident.timeline, line];
        incident.status = status;
        if (status === 'resolved') {
          incident.resolvedAt = line.at;
          incident.resolvedBy = by;
        }
      }
      incident.updatedAt = iso(now);
      return HttpResponse.json<Incident>(incident);
    }),
  ),
];
