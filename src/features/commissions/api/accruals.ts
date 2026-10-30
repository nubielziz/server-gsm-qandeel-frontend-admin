// Commission accruals (`/admin/commission-accruals*`): the Accruals tab of the Commissions page (`accrualsTab` in
// 46-p-commissions.js) and the bulk approval behind "Approve and pay out" (`approveAccruals` in 11-state.js). The server
// posts the ledger entry on each agent's wallet and decides which accruals may be approved. Bodies are assumed contracts (M10).
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
import type { ApproveAccrualsBody, ApproveAccrualsResult, CommissionAccrual } from '../types';

/**
 * The accruals, one page of them, with the total in `x-total-count`. Filters: `status` (`accrued` or `approved`),
 * `beneficiaryId` (the agent) and `createdAt_gte`. The tab counts and the header strip are this call too.
 * Assumed contract: rows carry the generated columns plus the joined `beneficiary` (the agent) and `merchant` (the referred
 * merchant whose order earned it).
 * @route GET /admin/commission-accruals
 */
export function listAccruals(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<CommissionAccrual>> {
  return apiList<CommissionAccrual>('/admin/commission-accruals', query, undefined, init);
}

/**
 * One accrual.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/commission-accruals/:id
 */
export function getAccrual(id: Id, init?: ApiInit): Promise<CommissionAccrual> {
  return apiGet<CommissionAccrual>(pathOf('/admin/commission-accruals/:id', { id }), undefined, init);
}

/**
 * Approves accruals in bulk and pays them out: the server posts a ledger entry on each agent's wallet. An accrual that
 * cannot be approved (already approved, not found) is skipped with a reason and does not stop the others.
 * Assumed contract: body `{ ids }`, answer `{ approved, total, skipped: [{ id, reason }] }`.
 * @route POST /admin/commission-accruals/approve
 */
export function approveAccruals(body: ApproveAccrualsBody, init?: ApiInit): Promise<ApproveAccrualsResult> {
  return apiPost<ApproveAccrualsResult>('/admin/commission-accruals/approve', body, init);
}
