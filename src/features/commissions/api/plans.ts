// Commission plans (`/admin/commission-plans*`): the Plans tab of the Commissions page (`plansTab` in 46-p-commissions.js). The
// demo only edited a plan's rate; the map gives full create, update and delete, so the tab does too. The map gives no
// bodies (MISMATCHES M10), so shapes are assumed contracts.
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
import type { CommissionPlan, CreatePlanBody, UpdatePlanBody } from '../types';

/**
 * The commission plans. The Plans tab and the plan menu of the assign dialog read it.
 * Assumed contract: rows carry the generated plan columns and `kind` (`referral` or `rebate`).
 * @route GET /admin/commission-plans
 */
export function listPlans(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<CommissionPlan>> {
  return apiList<CommissionPlan>('/admin/commission-plans', query, undefined, init);
}

/**
 * One plan.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/commission-plans/:id
 */
export function getPlan(id: Id, init?: ApiInit): Promise<CommissionPlan> {
  return apiGet<CommissionPlan>(pathOf('/admin/commission-plans/:id', { id }), undefined, init);
}

/**
 * Creates a plan. The rate is a decimal string ("3.5" is 3.5%); `tiers` holds the plan's conditions.
 * Assumed contract: body `{ name, kind, percent, basis, period, tiers, isActive }`, answer the new plan.
 * @route POST /admin/commission-plans
 */
export function createPlan(body: CreatePlanBody, init?: ApiInit): Promise<CommissionPlan> {
  return apiPost<CommissionPlan>('/admin/commission-plans', body, init);
}

/**
 * Changes a plan; only the fields that change are sent. A new rate applies to orders completed after the change.
 * Assumed contract: body is any of the fields of `UpdatePlanBody`, answer the updated plan.
 * @route PATCH /admin/commission-plans/:id
 */
export function updatePlan(id: Id, body: UpdatePlanBody, init?: ApiInit): Promise<CommissionPlan> {
  return apiPatch<CommissionPlan>(pathOf('/admin/commission-plans/:id', { id }), body, init);
}

/**
 * Deletes a plan. The server refuses (409) a plan that agents are still assigned to, and the dialog shows its message.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/commission-plans/:id
 */
export function deletePlan(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/commission-plans/:id', { id }), undefined, init);
}
