// EndAssignmentDialog: "End <agent>'s plan?" with a review step (`DELETE /admin/commission-assignments/:id`). The merchant stops
// earning on new orders; accruals already earned stay as they are. The server's refusal, if any, shows in the dialog.
import { ConfirmDialog } from '@/components/ui';
import { useEndAssignment } from '../hooks/useAssignmentMutations';
import { agentLabel, planLabel } from '../lib/assignment';
import type { CommissionAssignment } from '../types';

/** The review step before an assignment is ended. */
export function EndAssignmentDialog({
  assignment,
  onClose,
}: {
  assignment: CommissionAssignment;
  onClose: () => void;
}) {
  const end = useEndAssignment();
  return (
    <ConfirmDialog
      open
      title={`End ${agentLabel(assignment)}’s plan?`}
      body={
        <p>
          {agentLabel(assignment)} stops earning on the {planLabel(assignment)} plan for new orders.
          Commissions already earned stay as they are and can still be approved.
        </p>
      }
      confirm="End plan"
      kind="danger"
      onClose={onClose}
      onConfirm={() => end.mutateAsync(assignment).then(() => undefined)}
    />
  );
}
