// DeletePlanDialog: "Delete <plan> plan?" with a review step. The server refuses a plan that agents are still assigned to; the dialog
// shows its message, so the admin knows to end those assignments (or move the agents) first.
import { ConfirmDialog } from '@/components/ui';
import { useDeletePlan } from '../hooks/usePlanMutations';
import type { CommissionPlan } from '../types';

/** The review step before a plan is deleted. */
export function DeletePlanDialog({ plan, onClose }: { plan: CommissionPlan; onClose: () => void }) {
  const remove = useDeletePlan();
  return (
    <ConfirmDialog
      open
      title={`Delete ${plan.name} plan?`}
      body={<p>The plan is removed for good. A plan that agents are still assigned to cannot be deleted.</p>}
      confirm="Delete plan"
      kind="danger"
      onClose={onClose}
      onConfirm={() => remove.mutateAsync(plan).then(() => undefined)}
    />
  );
}
