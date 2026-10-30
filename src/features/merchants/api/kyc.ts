// Verification (KYC) routes (`/admin/kyc-submissions*`). A tab the demo lacks: it only showed a "Verified / In review" word on
// each merchant (MISMATCHES M47). The map gives no bodies (MISMATCHES M10), so shapes are assumed contracts.
import {
  apiGet,
  apiList,
  apiPost,
  apiUrl,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { KycDecisionBody, KycSubmission } from '../types';

/**
 * The verification requests, one page of them, with the total in `x-total-count`. Filter by `status` (`pending`,
 * `approved`, `rejected`) or `clientId`; the pending count on the tab is this call with `_start=0&_end=1`. Needs `kyc:read`.
 * Assumed contract: rows carry the joined `client` (name, email, country, status) and `reviewedBy`.
 * @route GET /admin/kyc-submissions
 */
export function listKycSubmissions(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<KycSubmission>> {
  return apiList<KycSubmission>('/admin/kyc-submissions', query, undefined, init);
}

/**
 * One verification request, to refresh the open drawer after a decision.
 * Assumed contract: same shape as a list row, with the uploaded documents named in `files`.
 * @route GET /admin/kyc-submissions/:id
 */
export function getKycSubmission(id: Id, init?: ApiInit): Promise<KycSubmission> {
  return apiGet<KycSubmission>(pathOf('/admin/kyc-submissions/:id', { id }), undefined, init);
}

/**
 * Approves or rejects a verification request. A rejection carries the reason. The server updates the merchant's
 * verification status and refuses a request that was already decided. Needs `kyc:decide`.
 * Assumed contract: body `{ decision: 'approve' | 'reject', note? }`, answer the request after the decision.
 * @route POST /admin/kyc-submissions/:id/decide
 */
export function decideKycSubmission(id: Id, body: KycDecisionBody, init?: ApiInit): Promise<KycSubmission> {
  return apiPost<KycSubmission>(pathOf('/admin/kyc-submissions/:id/decide', { id }), body, init);
}

/**
 * The link that opens an uploaded document. The files route belongs to the orders feature, which tags it; this feature
 * only builds the same plain link (the server redirects to a short-lived signed address), so no request is made here.
 * Needs `files:read`.
 */
export function kycFileUrl(fileId: Id): string {
  return apiUrl(pathOf('/admin/files/:id', { id: fileId }));
}
