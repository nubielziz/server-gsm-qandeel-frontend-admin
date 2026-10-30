// Commission assignments (`/admin/commission-assignments*`): a plan linked to the merchant who benefits from it. They are the
// Agents tab of the Commissions page (`agentsTab` in 46-p-commissions.js): the demo marked merchants with `isAgent` and a
// `plan`; the map makes that a row of its own (MISMATCHES M53). Bodies are assumed contracts (M10).
import {
  apiDelete,
  apiGet,
  apiList,
  apiPatch,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { CommissionAssignment, CreateAssignmentBody, UpdateAssignmentBody } from '../types';

/**
 * The assignments: the agents and their plans. The Agents tab, the agent filter of the accruals and the plans' agent
 * counts read it.
 * Assumed contract: rows carry the generated columns plus the joined `beneficiary` (the merchant) and `plan`.
 * @route GET /admin/commission-assignments
 */
export function listAssignments(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<CommissionAssignment>> {
  return apiList<CommissionAssignment>('/admin/commission-assignments', query, undefined, init);
}

/**
 * One assignment.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/commission-assignments/:id
 */
export function getAssignment(id: Id, init?: ApiInit): Promise<CommissionAssignment> {
  return apiGet<CommissionAssignment>(pathOf('/admin/commission-assignments/:id', { id }), undefined, init);
}

/**
 * Puts a merchant on a plan, which makes it an agent. The server sets the scope and the start (now) and refuses a merchant
 * or plan that does not exist.
 * Assumed contract: body `{ beneficiaryId, planId }`, answer the new assignment.
 * @route POST /admin/commission-assignments
 */
export function createAssignment(body: CreateAssignmentBody, init?: ApiInit): Promise<CommissionAssignment> {
  return apiPost<CommissionAssignment>('/admin/commission-assignments', body, init);
}

/**
 * Moves an agent to another plan. Orders completed from now on earn the new plan's rate; accruals already earned keep theirs.
 * Assumed contract: body `{ planId }`, answer the updated assignment.
 * @route PATCH /admin/commission-assignments/:id
 */
export function updateAssignment(
  id: Id,
  body: UpdateAssignmentBody,
  init?: ApiInit,
): Promise<CommissionAssignment> {
  return apiPatch<CommissionAssignment>(pathOf('/admin/commission-assignments/:id', { id }), body, init);
}

/**
 * Ends an assignment: the merchant stops earning on new orders.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/commission-assignments/:id
 */
export function deleteAssignment(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/commission-assignments/:id', { id }), undefined, init);
}
