// Creating, editing and deleting plans. A plan change also refreshes the assignments, which show the plan's name and rate. The dialogs
// show a failed call themselves (for example a plan that agents are still assigned to).
import { useApiMutation } from '@/lib/query';
import { createPlan, deletePlan, updatePlan } from '../api';
import type { CommissionPlan, CreatePlanBody, UpdatePlanBody } from '../types';

const NO_ERROR_TOAST = () => false as const;

/** Creates a plan. */
export function useCreatePlan() {
  return useApiMutation({
    mutationFn: (body: CreatePlanBody) => createPlan(body),
    invalidates: [{ resource: 'commission-plans' }],
    successNotification: (plan) => ({ message: `${plan.name} plan created` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a plan. */
export function useUpdatePlan() {
  return useApiMutation({
    mutationFn: ({ plan, body }: { plan: CommissionPlan; body: UpdatePlanBody }) => updatePlan(plan.id, body),
    invalidates: (_result, { plan }) => [
      { resource: 'commission-plans', id: plan.id },
      { resource: 'commission-assignments' },
    ],
    successNotification: (plan) => ({
      message: `${plan.name} plan updated`,
      description: 'New completed orders earn this plan’s terms.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Deletes a plan. The server refuses one that agents are still assigned to. */
export function useDeletePlan() {
  return useApiMutation({
    mutationFn: (plan: CommissionPlan) => deletePlan(plan.id),
    invalidates: (_result, plan) => [{ resource: 'commission-plans', id: plan.id }],
    successNotification: (_result, plan) => ({ message: `${plan.name} plan deleted` }),
    errorNotification: NO_ERROR_TOAST,
  });
}
