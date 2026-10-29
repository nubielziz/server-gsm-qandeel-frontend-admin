// Helpers the order mock handlers share: what "open" means, the refusal for a closed order, who is acting, and the wrapper
// every `POST /admin/orders/:id/<action>` route uses (find the order, run the change, answer 204 or the refusal).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { latency } from '../latency';
import { orderStore, type MockOrder } from '../orders';
import type { Actor } from '../ordersActions';
import { problem } from '../problem';
import { currentStaff, guard } from '../session';
import { bodyOf, notFound } from './accessShared';

export const isOpen = (row: MockOrder): boolean => row.status === 'pending' || row.status === 'processing';

export const closed = () =>
  problem(409, 'ORDER_NOT_OPEN', 'Order is closed', 'Only an open order can be changed.');

export async function actorOf(): Promise<Actor> {
  const staff = await currentStaff();
  return { type: 'staff', id: staff?.id ?? null, name: staff?.name ?? 'Staff' };
}

type Apply = (
  order: MockOrder,
  body: Record<string, unknown>,
  actor: Actor,
) => Promise<Response | void> | Response | void;

// `POST /admin/orders/:id/<suffix>`: finds the order, runs the change, answers 204 or the refusal.
export function orderAction(suffix: string, apply: Apply): HttpHandler {
  return http.post(`*/admin/orders/:id/${suffix}`, async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const order = (await orderStore()).find(String(params.id));
    if (!order) return notFound('order', params.id);
    const result = await apply(order, await bodyOf(request), await actorOf());
    return result instanceof Response ? result : new HttpResponse(null, { status: 204 });
  });
}
