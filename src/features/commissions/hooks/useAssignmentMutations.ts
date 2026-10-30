// Assigning a plan to a merchant, moving an agent to another plan, and ending an assignment. Each also refreshes the plan list (its
// agent counts) and the status counts' agent menu. The dialogs show a failed call themselves.
import { useApiMutation } from '@/lib/query';
import { createAssignment, deleteAssignment, updateAssignment } from '../api';
import type { CommissionAssignment, CreateAssignmentBody } from '../types';
import { agentLabel } from '../lib/assignment';

const NO_ERROR_TOAST = () => false as const;

const STALE = [{ resource: 'commission-assignments' }, { resource: 'commission-plans' }];

/** Puts a merchant on a plan. */
export function useAssignPlan() {
  return useApiMutation({
    mutationFn: (body: CreateAssignmentBody) => createAssignment(body),
    invalidates: STALE,
    successNotification: (assignment) => ({
      message: `${agentLabel(assignment)} is on a plan now`,
      description: 'Referred merchants’ completed orders earn it a commission.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Moves an agent to another plan. */
export function useChangeAssignmentPlan() {
  return useApiMutation({
    mutationFn: ({ assignment, planId }: { assignment: CommissionAssignment; planId: number }) =>
      updateAssignment(assignment.id, { planId }),
    invalidates: STALE,
    successNotification: (assignment) => ({
      message: `${agentLabel(assignment)} moved to ${assignment.plan?.name ?? 'the new plan'}`,
      description: 'Accruals already earned keep the rate they were earned at.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Ends an assignment. */
export function useEndAssignment() {
  return useApiMutation({
    mutationFn: (assignment: CommissionAssignment) => deleteAssignment(assignment.id),
    invalidates: STALE,
    successNotification: (_result, assignment) => ({ message: `${agentLabel(assignment)}’s plan ended` }),
    errorNotification: NO_ERROR_TOAST,
  });
}
