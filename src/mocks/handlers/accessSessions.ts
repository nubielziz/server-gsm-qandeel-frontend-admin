// Mock of the session routes (`/admin/sessions*`): list the open sessions of staff and merchants, end one.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { Session } from '@/features/access';
import { latency } from '../latency';
import { currentStaff, guard } from '../session';
import { sessionStore } from '../sessions';
import { notFound, readHandlers } from './accessShared';

export const sessionHandlers: HttpHandler[] = [
  // The sessions list marks the caller's own session: the first one of the signed-in staff member.
  ...readHandlers({
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
  }),

  http.delete('*/admin/sessions/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const removed = (await sessionStore()).remove(String(params.id));
    return removed ? new HttpResponse(null, { status: 204 }) : notFound('session', params.id);
  }),
];
