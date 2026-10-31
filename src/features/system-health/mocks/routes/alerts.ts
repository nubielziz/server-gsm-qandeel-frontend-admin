// Mock routes of the fired alerts: `GET /admin/alerts` (+ `/:id`) and `POST /admin/alerts/:id/ack`. Acknowledging
// records who and when and stops the reminders; only the server closes an alert, when the value is back in range.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { AlertEvent } from '../../types';
import { invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { problem } from '@/mocks/problem';
import { iso } from '../clock';
import { listAnswer, route, staffRef } from '../http';

export const alertRoutes: HttpHandler[] = [
  http.get(
    '*/admin/alerts',
    route({}, ({ state, url }) =>
      listAnswer(state.alerts.list(), url, {
        search: ['rule.name', 'subjectLabel', 'note'],
        sort: 'startedAt',
        order: 'desc',
      }),
    ),
  ),

  http.get(
    '*/admin/alerts/:id',
    route({}, ({ state, params }) => {
      const alert = state.alerts.find(String(params.id));
      return alert ? HttpResponse.json<AlertEvent>(alert) : notFound('alert', params.id);
    }),
  ),

  http.post(
    '*/admin/alerts/:id/ack',
    route({ write: 'alerts:update' }, async ({ state, params, body, now }) => {
      const alert = state.alerts.find(String(params.id));
      if (!alert) return notFound('alert', params.id);
      if (alert.status === 'resolved') {
        return problem(
          409,
          'ALERT_RESOLVED',
          'Alert already resolved',
          'This alert closed on its own, so there is nothing to acknowledge.',
        );
      }
      if (alert.status === 'acknowledged') {
        const who = alert.acknowledgedBy?.name ?? 'Someone';
        return problem(
          409,
          'ALERT_ACKNOWLEDGED',
          'Already acknowledged',
          `${who} already acknowledged this alert.`,
        );
      }
      const note = textOf((await body()).note);
      if (note.length > 500) {
        return invalid([{ field: 'note', message: 'Keep the note under 500 characters.' }]);
      }
      // The row is shared with the list, so changing it is the write.
      alert.status = 'acknowledged';
      alert.acknowledgedAt = iso(now);
      alert.acknowledgedBy = await staffRef();
      alert.note = note || null;
      return HttpResponse.json<AlertEvent>(alert);
    }),
  ),
];
