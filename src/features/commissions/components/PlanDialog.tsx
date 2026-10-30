// PlanDialog: "New plan" and "Edit plan" (`POST` and `PATCH /admin/commission-plans`): a name, the kind (referral or rebate), the rate,
// what it is paid on, the period, the conditions (JSON, as the plan's `tiers`) and whether it is active. Ports the demo's `plan-edit`
// dialog of 46-p-commissions.js, which only changed the rate. Only what changed is sent on an edit; the server checks the rate's range.
import { useForm } from 'react-hook-form';
import {
  CheckboxField,
  dialogSubmit,
  FormDialog,
  SelectField,
  TextareaField,
  TextField,
  toast,
} from '@/components/ui';
import { pct } from '@/lib/format';
import { useCreatePlan, useUpdatePlan } from '../hooks/usePlanMutations';
import { conditionsToField, isRateText, KIND_OPTIONS, parseConditions, sameConditions } from '../lib/plans';
import type { CommissionPlan, PlanKind, UpdatePlanBody } from '../types';

type Values = {
  name: string;
  kind: PlanKind;
  percent: string;
  basis: string;
  period: string;
  tiers: string;
  isActive: boolean;
};

export interface PlanDialogProps {
  /** The plan to edit; leave out to create one. */
  plan?: CommissionPlan;
  onClose: () => void;
}

/** Creates a plan, or edits the one it is given. */
export function PlanDialog({ plan, onClose }: PlanDialogProps) {
  const create = useCreatePlan();
  const update = useUpdatePlan();
  const form = useForm<Values>({
    defaultValues: {
      name: plan?.name ?? '',
      kind: plan?.kind ?? 'referral',
      percent: plan ? String(Number(plan.percent)) : '',
      basis: plan?.basis ?? '',
      period: plan?.period ?? '',
      tiers: conditionsToField(plan?.tiers),
      isActive: plan?.isActive ?? true,
    },
  });
  const {
    register,
    setError,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const conditions = parseConditions(values.tiers);
      if (!conditions.ok) {
        setError('tiers', { type: 'validate', message: conditions.message }, { shouldFocus: true });
        return false;
      }
      const next = {
        name: values.name.trim(),
        kind: values.kind,
        percent: values.percent.trim(),
        basis: values.basis.trim(),
        period: values.period.trim(),
        tiers: conditions.value,
        isActive: values.isActive,
      };
      if (!plan) {
        await create.mutateAsync(next);
        return;
      }
      const body: UpdatePlanBody = {};
      if (next.name !== plan.name) body.name = next.name;
      if (next.kind !== plan.kind) body.kind = next.kind;
      if (Number(next.percent) !== Number(plan.percent)) body.percent = next.percent;
      if (next.basis !== plan.basis) body.basis = next.basis;
      if (next.period !== plan.period) body.period = next.period;
      if (!sameConditions(next.tiers, plan.tiers)) body.tiers = next.tiers;
      if (next.isActive !== plan.isActive) body.isActive = next.isActive;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ plan, body });
    },
    { fields: ['name', 'kind', 'percent', 'basis', 'period', 'tiers', 'isActive'] },
  );

  return (
    <FormDialog
      open
      title={plan ? `Edit ${plan.name} plan` : 'New plan'}
      sub={
        plan
          ? `Currently ${pct(plan.percent, 1)} of ${plan.basis.toLowerCase()}`
          : 'A plan sets the rate an agent earns.'
      }
      confirm={plan ? 'Save plan' : 'Create plan'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="Name"
          autoComplete="off"
          maxLength={80}
          autoFocus
          error={errors.name}
          {...register('name', { validate: (value) => value.trim() !== '' || 'Enter a name.' })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Kind"
            selectWrapClassName="w-full"
            options={KIND_OPTIONS}
            error={errors.kind}
            {...register('kind')}
          />
          <TextField
            label="Rate (%)"
            inputMode="decimal"
            autoComplete="off"
            hint="Applies to orders completed from now on."
            error={errors.percent}
            {...register('percent', {
              validate: (value) => isRateText(value) || 'Enter a rate between 0 and 100, for example 3.5.',
            })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Paid on"
            autoComplete="off"
            hint="What the rate is taken from, for example order revenue."
            error={errors.basis}
            {...register('basis', {
              validate: (value) => value.trim() !== '' || 'Enter what the rate is paid on.',
            })}
          />
          <TextField
            label="Period"
            autoComplete="off"
            hint="How often it is settled, for example monthly."
            error={errors.period}
            {...register('period', { validate: (value) => value.trim() !== '' || 'Enter the period.' })}
          />
        </div>
        <TextareaField
          label="Conditions"
          rows={4}
          spellCheck={false}
          className="mono"
          hint={
            <>
              Optional. A JSON object such as <span className="mono">{'{"minPayout": "50"}'}</span>. Leave
              empty for none.
            </>
          }
          error={errors.tiers}
          {...register('tiers')}
        />
        <CheckboxField label="Active" error={errors.isActive} {...register('isActive')} />
      </div>
    </FormDialog>
  );
}
