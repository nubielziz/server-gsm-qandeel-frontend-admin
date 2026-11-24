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

/** A row as an older server may send it: it also listed the sign-in sessions of merchants. */
type SessionWire = Omit<Session, 'subjectType'> & { subjectType: string };

/**
 * The open sign-in sessions of staff: who, from which address and device, when last seen and when it ends. The total
 * comes in `x-total-count`. The server does the choosing: the request always carries `subjectType=staff`, so the total
 * and the pages count staff only. A row of a merchant that still comes back (a server that ignores the filter) is
 * dropped as a second line of defence; a row with no `subjectType` is kept.
 * Assumed contract: filter `subjectType` (`staff` | `client`), rows shaped like `Session`.
 * @route GET /admin/sessions
 */
export async function listSessions(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Session>> {
  const page = await apiList<SessionWire>('/admin/sessions', query, { subjectType: 'staff' }, init);
  return { ...page, data: page.data.filter((row): row is Session => row.subjectType !== 'client') };
}

/**
 * Ends one session, signing that person out of that device. Ending your own session signs you out of the console.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/sessions/:id
 */
export function revokeSession(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/sessions/:id', { id }), undefined, init);
}
