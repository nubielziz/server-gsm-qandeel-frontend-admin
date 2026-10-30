// Mock of the review queue routes (`GET /admin/risk/queue`, `POST /admin/risk/orders/:id/approve|refund`). The queue is built
// from the demo's held storefront orders; a decision changes the shared order store, so the Orders page agrees with it. The
// refusals are the obvious ones (no such order, nothing to decide): the real server owns the rules (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { bodyOf, notFound, textOf } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { orderStore, type MockOrder } from '@/mocks/orders';
import type { Actor } from '@/mocks/ordersActions';
import { problem } from '@/mocks/problem';
import { currentStaff, guard } from '@/mocks/session';
import type { RefundHeldBody } from '../types';
import { approveMock, refundMock } from './decisions';
import type { MockAssessment, RiskMockState } from './seed';
import { buildQueue, isHeld, riskState } from './store';

async function actorOf(): Promise<Actor> {
  const staff = await currentStaff();
  return { type: 'staff', id: staff?.id ?? null, name: staff?.name ?? 'Staff' };
}

type Decide = (
  state: RiskMockState,
  assessment: MockAssessment,
  order: MockOrder,
  actor: Actor,
  body: Record<string, unknown>,
) => Promise<void> | void;

// `POST /admin/risk/orders/:id/<suffix>`: finds the held order, runs the decision, answers 204 or the refusal.
function decision(suffix: string, apply: Decide): HttpHandler {
  return http.post(`*/admin/risk/orders/:id/${suffix}`, async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await riskState();
    const assessment = state.assessments.find(String(params.id));
    const order = (await orderStore()).find(String(params.id));
    if (!assessment || !order) return notFound('held order', params.id);
    if (!isHeld(assessment) || order.queue !== 'review') {
      return problem(
        409,
        'NOT_HELD',
        'Not waiting for a decision',
        'This order is not held for review any more.',
      );
    }
    await apply(state, assessment, order, await actorOf(), await bodyOf(request));
    return new HttpResponse(null, { status: 204 });
  });
}

export const queueHandlers: HttpHandler[] = [
  http.get('*/admin/risk/queue', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    return HttpResponse.json(buildQueue((await riskState()).assessments.list()));
  }),

  decision('approve', (_state, assessment, order, actor) => approveMock(assessment, order, actor)),

  decision('refund', (state, assessment, order, actor, body) => {
    const input: RefundHeldBody = {
      reason: textOf(body.reason) || undefined,
      blockEmail: body.blockEmail === true,
      blockDevice: body.blockDevice === true,
    };
    return refundMock(state, assessment, order, actor, input);
  }),
];
