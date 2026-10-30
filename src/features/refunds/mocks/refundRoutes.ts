// Mock of the refund routes (`/admin/refunds`, `/admin/refunds/:id` and the approve, decline and retry actions). The reads
// filter, sort and page like the real list; the actions refuse what the server would refuse (a refund already decided, an
// amount that is too high or empty, a decline without a reason) so the dialogs have real answers to show.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { bodyOf, invalid, notFound, readHandlers, textOf } from '@/mocks/handlers/accessShared';
import { actorOf } from '@/mocks/handlers/ordersShared';
import { latency } from '@/mocks/latency';
import type { Actor } from '@/mocks/ordersActions';
import { problem } from '@/mocks/problem';
import { toMoney } from '@/mocks/seed';
import { guard } from '@/mocks/session';
import { money } from '@/lib/format';
import { compareMoney, isPositive, parseAmount } from '../lib/amount';
import { refundLabel } from '../lib/labels';
import type { Refund } from '../types';
import { completeRefundMock, declineRefundMock } from './refundActions';
import type { RefundsMockState } from './seed';
import { refundsState } from './store';

type Apply = (
  refund: Refund,
  state: RefundsMockState,
  body: Record<string, unknown>,
  actor: Actor,
) => Promise<Response | void>;

// `POST /admin/refunds/:id/<suffix>`: finds the refund, runs the change and answers the updated refund, or the refusal.
function refundAction(suffix: string, apply: Apply): HttpHandler {
  return http.post(`*/admin/refunds/:id/${suffix}`, async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await refundsState();
    const refund = state.refunds.find(String(params.id));
    if (!refund) return notFound('refund', params.id);
    const refusal = await apply(refund, state, await bodyOf(request), await actorOf());
    return refusal ?? HttpResponse.json(refund);
  });
}

const alreadyDecided = (refund: Refund) =>
  problem(
    409,
    'REFUND_NOT_PENDING',
    'Refund already decided',
    `${refundLabel(refund.id)} is no longer waiting for approval.`,
  );

// What can still go back on the payment: what was paid minus the other refunds already completed on it.
function refundable(state: RefundsMockState, refund: Refund): number {
  const earlier = state.refunds
    .list()
    .filter(
      (other) => other !== refund && other.payment.id === refund.payment.id && other.status === 'completed',
    )
    .reduce((total, other) => total + Number(other.amount), 0);
  return Math.max(0, Number(refund.payment.amount) - earlier);
}

export const refundHandlers: HttpHandler[] = [
  refundAction('approve', async (refund, state, body, actor) => {
    if (refund.status !== 'requested') return alreadyDecided(refund);
    const amount = body.amount === undefined ? refund.amount : parseAmount(String(body.amount));
    const limit = refundable(state, refund);
    if (amount === null || !isPositive(amount) || compareMoney(amount, toMoney(limit)) > 0) {
      return invalid([{ field: 'amount', message: `Enter an amount between $0.01 and ${money(limit)}.` }]);
    }
    await completeRefundMock(state, refund, Number(amount), actor);
  }),

  refundAction('decline', async (refund, _state, body, actor) => {
    if (refund.status !== 'requested') return alreadyDecided(refund);
    const reason = textOf(body.reason);
    if (reason.length < 10) {
      return invalid([{ field: 'reason', message: 'Give the customer a reason, at least a sentence.' }]);
    }
    await declineRefundMock(refund, reason, actor);
  }),

  refundAction('retry', async (refund, state, _body, actor) => {
    if (refund.status !== 'failed') {
      return problem(
        409,
        'REFUND_NOT_FAILED',
        'Nothing to retry',
        `${refundLabel(refund.id)} did not fail at the gateway.`,
      );
    }
    await completeRefundMock(state, refund, Number(refund.amount), actor);
  }),

  ...readHandlers({
    base: '/admin/refunds',
    what: 'refund',
    source: async () => ({ rows: (await refundsState()).refunds.list(), toDto: (refund) => refund }),
    searchFields: ['id', 'reason', 'customer.name'],
  }),
];
