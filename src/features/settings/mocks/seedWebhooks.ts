// Makes up the merchant webhook log: the demo has none. Each merchant (from the demo's `S.merchants`) gets an address, and the
// deliveries cycle through the events and outcomes below. Nothing here is random, so tests see the same rows.
import { demoNumericId, toIso } from '@/mocks/seed';
import type { WebhookDeliveryDetail } from '../types';

type DemoMerchant = { id: string; name: string };

const EVENTS = ['order.completed', 'order.rejected', 'deposit.approved', 'order.completed', 'order.created'];
const MINUTE_MS = 60_000;

// Outcome by position: mostly delivered, some refused by the merchant's server, one that never answered, one waiting.
function outcome(index: number) {
  if (index % 9 === 2)
    return { status: 'failed', code: 500, error: null, body: '{"error":"internal"}' } as const;
  if (index % 9 === 5)
    return {
      status: 'failed',
      code: 0,
      error: 'The merchant’s server did not answer in 10 seconds.',
      body: null,
    } as const;
  if (index % 9 === 7) return { status: 'pending', code: 0, error: null, body: null } as const;
  return { status: 'delivered', code: 200, error: null, body: '{"ok":true}' } as const;
}

/** Thirty-six deliveries to the first four merchants, newest first. */
export function deliveryRows(merchants: DemoMerchant[]): WebhookDeliveryDetail[] {
  const now = Date.now();
  const clients = merchants.slice(0, 4).map((merchant) => ({
    id: demoNumericId(merchant.id),
    name: merchant.name,
    url: `https://hooks.${merchant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.example/gsm`,
  }));
  return Array.from({ length: 36 }, (_, index) => {
    const client = clients[index % clients.length];
    const result = outcome(index);
    const at = now - (index + 1) * 25 * MINUTE_MS;
    const event = EVENTS[index % EVENTS.length];
    return {
      id: 36 - index,
      endpointId: client.id,
      event,
      payload: { event, orderId: 48100 - index, createdAt: toIso(at) },
      attempt: result.status === 'delivered' ? 1 : 2 + (index % 3),
      status: result.status,
      responseCode: result.code,
      nextRetryAt: result.status === 'delivered' ? null : toIso(now + (index + 1) * MINUTE_MS),
      createdAt: toIso(at),
      endpoint: { id: client.id, url: client.url },
      client: { id: client.id, name: client.name },
      responseBody: result.body,
      error: result.error,
    };
  });
}
