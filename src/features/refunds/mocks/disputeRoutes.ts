// Mock of the dispute routes (`/admin/disputes`, `/admin/disputes/:id` and the evidence and accept actions). The list leaves the
// evidence pack out and the single read carries it, like the real API. The actions refuse what the server would refuse: a dispute
// that is not waiting for evidence, a missed deadline, a submission with nothing chosen.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { bodyOf, invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { actorOf } from '@/mocks/handlers/ordersShared';
import { latency } from '@/mocks/latency';
import type { Actor } from '@/mocks/ordersActions';
import { problem } from '@/mocks/problem';
import { guard } from '@/mocks/session';
import { disputeLabel } from '../lib/labels';
import type { Dispute } from '../types';
import { acceptLossMock, submitEvidenceMock } from './disputeActions';
import type { RefundsMockState } from './seed';
import { refundsState } from './store';

// The list row: the dispute without its pack.
function summary(dispute: Dispute): Dispute {
  const { evidence: _evidence, strength: _strength, ...row } = dispute;
  return row;
}

const notWaiting = (dispute: Dispute) =>
  problem(
    409,
    'DISPUTE_NOT_OPEN',
    'Dispute is not waiting for evidence',
    `${disputeLabel(dispute.id)} is ${dispute.status.replace('_', ' ')}, so it cannot be answered.`,
  );

type Apply = (
  dispute: Dispute,
  state: RefundsMockState,
  body: Record<string, unknown>,
  actor: Actor,
) => Promise<Response | void>;

// `POST /admin/disputes/:id/<suffix>`: finds the dispute, runs the change and answers the updated dispute, or the refusal.
function disputeAction(suffix: string, apply: Apply): HttpHandler {
  return http.post(`*/admin/disputes/:id/${suffix}`, async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await refundsState();
    const dispute = state.disputes.find(String(params.id));
    if (!dispute) return notFound('dispute', params.id);
    const refusal = await apply(dispute, state, await bodyOf(request), await actorOf());
    return refusal ?? HttpResponse.json(dispute);
  });
}

export const disputeHandlers: HttpHandler[] = [
  disputeAction('evidence', async (dispute, _state, body, actor) => {
    if (dispute.status !== 'needs_response') return notWaiting(dispute);
    if (dispute.evidenceDueAt && Date.parse(dispute.evidenceDueAt) < Date.now()) {
      return problem(
        409,
        'EVIDENCE_DEADLINE_PASSED',
        'The deadline has passed',
        `The card network no longer takes evidence for ${disputeLabel(dispute.id)}.`,
      );
    }
    const items = Array.isArray(body.items) ? body.items.filter((item) => typeof item === 'string') : [];
    if (items.length === 0) {
      return invalid([{ field: 'items', message: 'Choose at least one item of evidence.' }]);
    }
    const known = new Set((dispute.evidence ?? []).map((item) => item.key));
    if (items.some((item) => !known.has(item))) {
      return invalid([
        { field: 'items', message: 'One of the chosen items is not part of the evidence pack.' },
      ]);
    }
    if (textOf(body.note).length > 1000) {
      return invalid([{ field: 'note', message: 'Keep the note under 1000 characters.' }]);
    }
    await submitEvidenceMock(dispute, actor);
  }),

  disputeAction('accept', async (dispute, state, _body, actor) => {
    if (dispute.status !== 'needs_response') return notWaiting(dispute);
    await acceptLossMock(state, dispute, actor);
  }),

  // Special reads first: the single read (with the pack) must not be shadowed by anything generic.
  http.get('*/admin/disputes/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const dispute = (await refundsState()).disputes.find(String(params.id));
    return dispute ? HttpResponse.json(dispute) : notFound('dispute', params.id);
  }),

  http.get('*/admin/disputes', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const rows = (await refundsState()).disputes.list().map(summary);
    const { page, total } = applyListQuery(rows, new URL(request.url).searchParams, [
      'id',
      'reasonCode',
      'note',
      'customer.name',
    ]);
    return HttpResponse.json(page, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  }),
];
