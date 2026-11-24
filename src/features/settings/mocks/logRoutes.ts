// Mock of the notification log: the sent notifications (`/admin/notifications*`).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { listAnswer, notFound, signedIn } from './http';
import { settingsFeatureStore } from './store';

/** The log routes. */
export const logRoutes: HttpHandler[] = [
  http.get('*/admin/notifications', ({ request }) =>
    signedIn(request, async () =>
      listAnswer((await settingsFeatureStore()).notifications.list(), request, ['event', 'recipient']),
    ),
  ),

  http.get('*/admin/notifications/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const row = (await settingsFeatureStore()).notifications.find(String(params.id));
      return row ? HttpResponse.json(row) : notFound('notification', params.id);
    }),
  ),
];
