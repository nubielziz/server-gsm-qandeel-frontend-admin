// Mock of the session routes (`/admin/sessions*`): list the open sessions, end one. Like the server, the list holds the sessions of
// staff and of accounts (the sessions mock keeps a few of both) and narrows them by the `subjectType` filter of the query (`staff` or
// `account`), before the total and the row range are worked out. The Sessions tab sends the filter only when one kind is chosen.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { latency } from '../latency';
import { currentStaff, guard } from '../session';
import { sessionStore, type MockSession } from '../sessions';
import { notFound, readHandlers } from './accessShared';

/** A session as the list sends it: the caller's own session of a staff member carries `current`. */
type SessionDto = MockSession & { current?: true };

// Every session, with the caller's own marked: the first one of the signed-in staff member.
async function allSessions(): Promise<SessionDto[]> {
  const sessions = (await sessionStore()).list();
  const me = await currentStaff();
  const mine = sessions.find((row) => row.subjectType === 'staff' && row.subject.id === me?.id);
  return sessions.map((row): SessionDto => (row.id === mine?.id ? { ...row, current: true } : row));
}

export const sessionHandlers: HttpHandler[] = [
  ...readHandlers({
    base: '/admin/sessions',
    what: 'session',
    searchFields: ['ip', 'subject.name', 'subject.email'],
    source: async () => ({ rows: await allSessions(), toDto: (row): SessionDto => row }),
  }),

  http.delete('*/admin/sessions/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const removed = (await sessionStore()).remove(String(params.id));
    return removed ? new HttpResponse(null, { status: 204 }) : notFound('session', params.id);
  }),
];
