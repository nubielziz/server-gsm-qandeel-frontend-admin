// Alert rules for the Alerts & incidents tab (`CRUD /admin/alert-rules`): the metric, comparison, threshold, window,
// severity and channels of each rule, with a temporary mute. Assumed contracts (the map gives no bodies).
import {
  apiDelete,
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
import type { AlertRule, CreateAlertRuleBody, UpdateAlertRuleBody } from '../types';

/**
 * One page of the alert rules, with the total in `x-total-count`. The rules table shows each rule's condition, severity,
 * channels, whether it is switched on and whether it is muted.
 * Assumed contract: simple-rest range and sort (`_start`, `_end`, `_sort`, `_order`); each row is an `AlertRule`
 * (`open` says whether an alert of the rule is firing or acknowledged).
 * @route GET /admin/alert-rules
 */
export function listAlertRules(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<AlertRule>> {
  return apiList<AlertRule>('/admin/alert-rules', query, undefined, init);
}

/**
 * One rule, for the edit dialog and for the data hooks of Refine.
 * Assumed contract: same shape as a list row (`AlertRule`).
 * @route GET /admin/alert-rules/:id
 */
export function getAlertRule(id: Id, init?: ApiInit): Promise<AlertRule> {
  return apiGet<AlertRule>(pathOf('/admin/alert-rules/:id', { id }), undefined, init);
}

/**
 * Adds a rule. The server checks the metric, the threshold and the window and answers 422 with the field that is wrong.
 * Assumed contract: body `CreateAlertRuleBody`; answer the new `AlertRule`.
 * @route POST /admin/alert-rules
 */
export function createAlertRule(body: CreateAlertRuleBody, init?: ApiInit): Promise<AlertRule> {
  return apiPost<AlertRule>('/admin/alert-rules', body, init);
}

/**
 * Changes a rule; only the fields that change are sent. The same call switches a rule on or off (`isActive`) and mutes
 * it for a while (`mutedUntil`, or null to unmute).
 * Assumed contract: body `UpdateAlertRuleBody`; answer the updated `AlertRule`.
 * @route PATCH /admin/alert-rules/:id
 */
export function updateAlertRule(id: Id, body: UpdateAlertRuleBody, init?: ApiInit): Promise<AlertRule> {
  return apiPatch<AlertRule>(pathOf('/admin/alert-rules/:id', { id }), body, init);
}

/**
 * Deletes a rule, so it no longer alerts. The confirm dialog states this before the call.
 * Assumed contract: no body, no answer used.
 * @route DELETE /admin/alert-rules/:id
 */
export function deleteAlertRule(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/alert-rules/:id', { id }), undefined, init);
}
