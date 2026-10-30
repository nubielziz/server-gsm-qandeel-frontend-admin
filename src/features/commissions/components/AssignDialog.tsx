// AssignDialog: "Assign plan" (`POST /admin/commission-assignments`): pick a merchant and a plan, which makes the merchant an agent.
// The demo had no such dialog (agents were flagged in the seed); the map adds the assignment. The merchant menu reads the merchants
// feature's list, so it needs clients:read. The server's refusals (a merchant that already has a plan) show under the fields.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, SelectField } from '@/components/ui';
import { useAssignPlan } from '../hooks/useAssignmentMutations';
import { useCommissionGrants } from '../hooks/useCommissionGrants';
import { useMerchantChoices } from '../hooks/useMerchantChoices';
import { usePlans } from '../hooks/usePlans';
import { planChoices } from '../lib/plans';
import { LookupNote } from './LookupNote';

type Values = { beneficiaryId: string; planId: string };

/** Puts a merchant on a plan. */
export function AssignDialog({ onClose }: { onClose: () => void }) {
  const grants = useCommissionGrants();
  const merchants = useMerchantChoices(grants.can('clients:read'));
  const plans = usePlans();
  const assign = useAssignPlan();
  const form = useForm<Values>({ defaultValues: { beneficiaryId: '', planId: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      await assign.mutateAsync({
        beneficiaryId: Number(values.beneficiaryId),
        planId: Number(values.planId),
      });
    },
    { fields: ['beneficiaryId', 'planId'] },
  );

  const merchantOptions = [
    { value: '', label: 'Choose a merchant' },
    ...(merchants.data ?? []).map((merchant) => ({ value: merchant.id, label: merchant.name })),
  ];
  const planOptions = [{ value: '', label: 'Choose a plan' }, ...planChoices(plans.plans)];

  return (
    <FormDialog
      open
      title="Assign a plan"
      sub="The merchant becomes an agent and earns on the orders of the merchants it referred."
      confirm="Assign plan"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <div>
          <SelectField
            label="Merchant"
            selectWrapClassName="w-full"
            options={merchantOptions}
            error={errors.beneficiaryId}
            {...register('beneficiaryId', { validate: (value) => value !== '' || 'Choose a merchant.' })}
          />
          <LookupNote what="the merchants" query={merchants} />
        </div>
        <div>
          <SelectField
            label="Plan"
            selectWrapClassName="w-full"
            options={planOptions}
            error={errors.planId}
            {...register('planId', { validate: (value) => value !== '' || 'Choose a plan.' })}
          />
          <LookupNote what="the plans" query={plans.query} />
        </div>
      </div>
    </FormDialog>
  );
}
