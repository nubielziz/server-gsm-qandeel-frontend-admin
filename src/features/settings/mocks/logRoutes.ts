// Mock of the two logs: the sent notifications (`/admin/notifications*`) and the merchant webhook deliveries
// (`/admin/webhook-deliveries*`, with the retry). The mock refuses to retry a delivery that already worked.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { conflict, listAnswer, notFound, signedIn } from './http';
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

  http.post('*/admin/webhook-deliveries/:id/retry', ({ request, params }) =>
    signedIn(request, async () => {
      const { deliveries } = await settingsFeatureStore();
      const row = deliveries.find(String(params.id));
      if (!row) return notFound('delivery', params.id);
      if (row.status === 'delivered') {
        return conflict(
          'DELIVERY_SUCCEEDED',
          'Already delivered',
          'This delivery already worked, so there is nothing to send again.',
        );
      }
      return HttpResponse.json(
        deliveries.patch(row.id, {
          status: 'pending',
          attempt: row.attempt + 1,
          nextRetryAt: new Date().toISOString(),
        }),
      );
    }),
  ),

  http.get('*/admin/webhook-deliveries', ({ request }) =>
    signedIn(request, async () =>
      listAnswer((await settingsFeatureStore()).deliveries.list(), request, [
        'event',
        'client.name',
        'endpoint.url',
      ]),
    ),
  ),

  http.get('*/admin/webhook-deliveries/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const row = (await settingsFeatureStore()).deliveries.find(String(params.id));
      return row ? HttpResponse.json(row) : notFound('delivery', params.id);
    }),
  ),
];
