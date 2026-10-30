// Audit log routes (`/admin/audit-logs`): the list and one entry. Ports the data side of pageAudit (47-p-audit.js), which
// filtered the in-memory `S.audit` array. The log is read-only: entries cannot be edited or deleted, so there is no
// create, update or delete here. The map gives no bodies (MISMATCHES M10), so the filters and the joined names are assumed
// contracts (see `AuditLog`).
import { apiGet, apiList, pathOf, type ApiInit, type Id, type ListQuery, type ListResult } from '@/lib/api';
import type { AuditLog } from '../types';

/**
 * One page of the audit log, newest first (`_sort=createdAt&_order=desc`), with the total in `x-total-count`. Read it a page
 * at a time: the log only grows, so the screen asks for the next range when someone presses "Show more".
 * Assumed contract: field filters `actorType`, `actorId`, `entityType`, `from` and `to` (days, both included), and `q`,
 * which searches the person, the action and the record's name.
 * @route GET /admin/audit-logs
 */
export function listAuditLogs(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<AuditLog>> {
  return apiList<AuditLog>('/admin/audit-logs', query, undefined, init);
}

/**
 * One entry with its before and after, for the entries whose list row came without them.
 * Assumed contract: same shape as a list row, with `before` and `after` filled in.
 * @route GET /admin/audit-logs/:id
 */
export function getAuditLog(id: Id, init?: ApiInit): Promise<AuditLog> {
  return apiGet<AuditLog>(pathOf('/admin/audit-logs/:id', { id }), undefined, init);
}
