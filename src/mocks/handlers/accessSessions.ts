// Mock of the session routes (`/admin/sessions*`): list the open sessions of staff and merchants (`subjectId` with `subjectType`
// lists one account's, the merchant page's Security tab), end one.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { Session } from '@/features/access';
import { applyListQuery } from '../crud';
import { latency } from '../latency';
import { currentStaff, guard } from '../session';
import { sessionStore } from '../sessions';
import { invalid, notFound, readHandlers } from './accessShared';

// The sessions list marks the caller's own session: the first one of the signed-in staff member.
const [, showSession] = readHandlers({
  base: '/admin/sessions',
  what: 'session',
  searchFields: ['ip', 'subject.name', 'subject.email'],
  source: async () => {
    const sessions = await sessionStore();
    const me = await currentStaff();
    const mine = sessions.list().find((s) => s.subjectType === 'staff' && s.subject.id === me?.id);
    return {
      rows: sessions.list(),
      toDto: (row): Session => ({ ...row, ...(row.id === mine?.id ? { current: true } : {}) }),
    };
  },
});

export const sessionHandlers: HttpHandler[] = [
  // The list takes `subjectId` like the real route: it needs `subjectType` beside it (staff and merchant ids overlap, 422 else).
  http.get('*/admin/sessions', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const params = new URL(request.url).searchParams;
    const subjectId = params.get('subjectId');
    if (subjectId !== null && !params.get('subjectType')) {
      return invalid([{ field: 'subjectId', message: 'Send subjectType together with subjectId.' }]);
    }
    params.delete('subjectId');
    const sessions = await sessionStore();
    const me = await currentStaff();
    const mine = sessions.list().find((s) => s.subjectType === 'staff' && s.subject.id === me?.id);
    const rows = sessions
      .list()
      .filter((row) => subjectId === null || String(row.subject.id) === subjectId)
      .map((row): Session => ({ ...row, ...(row.id === mine?.id ? { current: true } : {}) }));
    const { page, total } = applyListQuery(rows, params, ['ip', 'subject.name', 'subject.email']);
    return HttpResponse.json(page as object[], {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  }),
  showSession,

  http.delete('*/admin/sessions/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const removed = (await sessionStore()).remove(String(params.id));
    return removed ? new HttpResponse(null, { status: 204 }) : notFound('session', params.id);
  }),
];
