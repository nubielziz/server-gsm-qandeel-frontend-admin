// Card dispute routes (`/admin/disputes*`): the list, one dispute with its evidence pack, and the two ways to answer one.
// Ports the data side of tabDisputes and the submitEvidence / acceptDispute mutations of 12-state-b2c.js. The map gives no
// bodies (MISMATCHES M10), so every body and answer here is an assumed contract.
import {
  apiGet,
  apiList,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { Dispute, SubmitEvidenceBody } from '../types';

/**
 * Card disputes (chargebacks) and their evidence deadline, one page of them, with the total in `x-total-count`.
 * Filter by `status`; sort with `_sort`/`_order` (`id`, `amount`, `evidenceDueAt`, `status`).
 * Assumed contract: rows carry the customer as a joined summary and leave the evidence pack out (see `Dispute`).
 * @route GET /admin/disputes
 */
export function listDisputes(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Dispute>> {
  return apiList<Dispute>('/admin/disputes', query, undefined, init);
}

/**
 * One dispute with its evidence pack (payment, delivery, order result, the terms the customer accepted) and how strong
 * the server judges the case. The pack is built from the order record on the server.
 * Assumed contract: same shape as a list row plus `evidence` and `strength`.
 * @route GET /admin/disputes/:id
 */
export function getDispute(id: Id, init?: ApiInit): Promise<Dispute> {
  return apiGet<Dispute>(pathOf('/admin/disputes/:id', { id }), undefined, init);
}

/**
 * Submits evidence to the card network before the deadline: the chosen lines of the pack and an optional note. The
 * dispute moves to `under_review`; the server answers 4xx after the deadline or for a dispute that is not waiting.
 * Assumed contract: body `{ items, note? }` (`items` are the `key`s of the pack lines), answer the updated dispute.
 * @route POST /admin/disputes/:id/evidence
 */
export function submitDisputeEvidence(
  id: Id,
  body: SubmitEvidenceBody,
  init?: ApiInit,
): Promise<Dispute | undefined> {
  return apiPost<Dispute | undefined>(pathOf('/admin/disputes/:id/evidence', { id }), body, init);
}

/**
 * Accepts the loss: the dispute closes as lost and the amount and the dispute fee are recorded in `chargeback_loss`.
 * It cannot be undone. The console does not block the customer (the map's accept writes only the dispute and the
 * ledger); blocking is a separate step on the customer's page.
 * Assumed contract: no body, answer the updated dispute.
 * @route POST /admin/disputes/:id/accept
 */
export function acceptDispute(id: Id, init?: ApiInit): Promise<Dispute | undefined> {
  return apiPost<Dispute | undefined>(pathOf('/admin/disputes/:id/accept', { id }), {}, init);
}
