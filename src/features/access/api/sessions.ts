// Session routes (`/admin/sessions*`). No demo screen exists for these: the sessions tab is built in the demo's style
// (feature plan, access). The map gives no bodies, so the shapes are assumed contracts (MISMATCHES M10).
import {
  apiDelete,
  apiList,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { Session } from '../types';

/**
 * The open sign-in sessions of staff and merchants: who, from which address and device, when last seen and when it
 * ends. Filter with `subjectType` (`staff` or `client`); the total comes in `x-total-count`.
 * Assumed contract: rows shaped like `Session`.
 * @route GET /admin/sessions
 */
export function listSessions(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Session>> {
  return apiList<Session>('/admin/sessions', query, undefined, init);
}

/**
 * Ends one session, signing that person out of that device. Ending your own session signs you out of the console.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/sessions/:id
 */
export function revokeSession(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/sessions/:id', { id }), undefined, init);
}
