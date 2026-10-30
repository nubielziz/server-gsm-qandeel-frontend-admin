// Abandoned checkouts and the recovery email (`/admin/checkouts/abandoned`, `/admin/checkouts/recover`). Ports the data side of
// pageCheckouts (51-p-checkouts.js) and sendRecovery (12-state-b2c.js). The map gives no bodies (MISMATCHES M10), so the shapes
// are assumed contracts; the consent rule is the map's (MISMATCHES M1).
import { apiList, apiPost, type ApiInit, type ListQuery, type ListResult } from '@/lib/api';
import type { AbandonedCheckout, RecoverCheckoutsBody, RecoverCheckoutsResult } from '../types';

/**
 * People who typed an email at checkout and left without paying, one page of them, with the total in `x-total-count`. Each row says
 * whether the customer agreed to marketing email and whether the server would send a recovery email now. Filters: `canRecover=true`
 * (only the ones that can be reminded), `q` (the email); sort with `_sort`/`_order` on `createdAt`, `grossAmount` or `recoveryEmailedAt`.
 * Assumed contract: simple-rest list, rows are `AbandonedCheckout` (the `checkout_sessions` row plus consent and the joins).
 * @route GET /admin/checkouts/abandoned
 */
export function listAbandonedCheckouts(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<AbandonedCheckout>> {
  return apiList<AbandonedCheckout>('/admin/checkouts/abandoned', query, undefined, init);
}

/**
 * Sends the recovery email (a one-click link back to the saved basket) to the chosen checkouts. It goes once per checkout and only
 * to customers with marketing consent; the server checks both again and says which checkouts it left out and why. A send cannot
 * be taken back.
 * Assumed contract: body `{ ids }`, answer `{ sent, skipped: [{ id, reason }] }`.
 * @route POST /admin/checkouts/recover
 */
export function recoverCheckouts(
  body: RecoverCheckoutsBody,
  init?: ApiInit,
): Promise<RecoverCheckoutsResult> {
  return apiPost<RecoverCheckoutsResult>('/admin/checkouts/recover', body, init);
}
