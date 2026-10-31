// Fired alerts for the Alerts & incidents tab: the list and one alert (`/admin/alerts`) and the acknowledge action.
// Alerts are made by the server's rules, so they cannot be created or deleted here. Assumed contracts.
import {
  apiGet,
  apiList,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { AckAlertBody, AlertEvent } from '../types';

/**
 * One page of the fired alerts, newest first, with the total in `x-total-count`. Each row carries its rule, its
 * subject (the supplier or account it is about) and who acknowledged it, so the list needs no second call.
 * Assumed contract: simple-rest range and sort (`_start`, `_end`, `_sort`, `_order`) and the field filters `status`
 * (`firing`, `acknowledged` or `resolved`) and `severity`; each row is an `AlertEvent`.
 * @route GET /admin/alerts
 */
export function listAlerts(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<AlertEvent>> {
  return apiList<AlertEvent>('/admin/alerts', query, undefined, init);
}

/**
 * One alert, for the dialog that declares an incident from it and for a link to a single alert.
 * Assumed contract: same shape as a list row (`AlertEvent`).
 * @route GET /admin/alerts/:id
 */
export function getAlert(id: Id, init?: ApiInit): Promise<AlertEvent> {
  return apiGet<AlertEvent>(pathOf('/admin/alerts/:id', { id }), undefined, init);
}

/**
 * Acknowledges an alert: the repeated messages stop and the server records the staff member and the time.
 * Assumed contract: body `AckAlertBody` (an optional `note`); answer the updated `AlertEvent`. The console does not
 * read the answer: it reads the lists again.
 * @route POST /admin/alerts/:id/ack
 */
export function ackAlert(id: Id, body: AckAlertBody, init?: ApiInit): Promise<AlertEvent> {
  return apiPost<AlertEvent>(pathOf('/admin/alerts/:id/ack', { id }), body, init);
}
