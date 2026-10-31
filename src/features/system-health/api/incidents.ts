// Incidents for the Alerts & incidents tab (`/admin/incidents`: list, show, create, update). An incident is declared by
// staff, its timeline grows with each update and it is closed with the root cause. Assumed contracts.
import {
  apiGet,
  apiList,
  apiPatch,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { CreateIncidentBody, Incident, UpdateIncidentBody } from '../types';

/**
 * One page of the incidents, newest first, with the total in `x-total-count`.
 * Assumed contract: simple-rest range and sort (`_start`, `_end`, `_sort`, `_order`) and the field filters `status`
 * (`investigating`, `identified`, `monitoring` or `resolved`) and `open=true` (every status but resolved); each row is
 * an `Incident`.
 * @route GET /admin/incidents
 */
export function listIncidents(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Incident>> {
  return apiList<Incident>('/admin/incidents', query, undefined, init);
}

/**
 * One incident with its timeline, for the drawer.
 * Assumed contract: same shape as a list row (`Incident`), with the whole `timeline`.
 * @route GET /admin/incidents/:id
 */
export function getIncident(id: Id, init?: ApiInit): Promise<Incident> {
  return apiGet<Incident>(pathOf('/admin/incidents/:id', { id }), undefined, init);
}

/**
 * Declares an incident, on its own or from an alert (`alertEventId`). The server starts the timeline at
 * "investigating" and writes the audit log entry.
 * Assumed contract: body `CreateIncidentBody`; answer the new `Incident`.
 * @route POST /admin/incidents
 */
export function createIncident(body: CreateIncidentBody, init?: ApiInit): Promise<Incident> {
  return apiPost<Incident>('/admin/incidents', body, init);
}

/**
 * Updates an incident. A new `status` with an `update` text adds a line to the timeline (the server writes it, with
 * the staff member and the time); `status: 'resolved'` closes the incident and needs the `rootCause`.
 * Assumed contract: body `UpdateIncidentBody`; answer the updated `Incident`.
 * @route PATCH /admin/incidents/:id
 */
export function updateIncident(id: Id, body: UpdateIncidentBody, init?: ApiInit): Promise<Incident> {
  return apiPatch<Incident>(pathOf('/admin/incidents/:id', { id }), body, init);
}
