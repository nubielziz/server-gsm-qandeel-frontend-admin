// ChangePlanDialog: "Change plan" (`PATCH /admin/commission-assignments/:id`): moves an agent to another plan. Orders completed from
// now on earn the new plan's rate; accruals already earned keep theirs (the demo's note on a rate change, 46-p-commissions.js).
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, SelectField, toast } from '@/components/ui';
import { useChangeAssignmentPlan } from '../hooks/useAssignmentMutations';
import { usePlans } from '../hooks/usePlans';
import { agentLabel, planLabel } from '../lib/assignment';
import { planChoices } from '../lib/plans';
import type { CommissionAssignment } from '../types';
import { LookupNote } from './LookupNote';

type Values = { planId: string };

/** Picks the agent's new plan. */
export function ChangePlanDialog({
  assignment,
  onClose,
}: {
  assignment: CommissionAssignment;
  onClose: () => void;
}) {
  const plans = usePlans();
  const change = useChangeAssignmentPlan();
  const form = useForm<Values>({ defaultValues: { planId: String(assignment.planId) } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const planId = Number(values.planId);
      if (planId === assignment.planId) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await change.mutateAsync({ assignment, planId });
    },
    { fields: ['planId'] },
  );

  // The agent's current plan stays in the menu while the plan list loads, so the select never shows another choice.
  const options = plans.plans.some((plan) => plan.id === assignment.planId)
    ? planChoices(plans.plans)
    : [{ value: assignment.planId, label: planLabel(assignment) }, ...planChoices(plans.plans)];

  return (
    <FormDialog
      open
      title={`Change plan of ${agentLabel(assignment)}`}
      sub={`Now on the ${planLabel(assignment)} plan`}
      confirm="Save plan"
      onClose={onClose}
      onSubmit={submit}
    >
      <SelectField
        label="Plan"
        selectWrapClassName="w-full"
        options={options}
        hint="Orders completed from now on earn the new plan’s rate. Accruals already earned keep theirs."
        error={errors.planId}
        {...register('planId')}
      />
      <LookupNote what="the plans" query={plans.query} />
    </FormDialog>
  );
}
