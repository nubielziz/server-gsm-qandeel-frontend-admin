// RuleDialog: "New rule" and "Edit rule" for a pricing rule (`POST` and `PATCH /admin/pricing-rules`). The demo only had the one-click
// "Add promo: Carrier unlock -2%" button (`cat-on`); this is the general form: what the rule covers, which merchant group, whether it
// adds (margin) or takes from (discount, promo) the price, by a percentage and/or a fixed amount, with rounding, priority and dates.
// Only what changed is sent on an edit.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, SelectField, TextField, toast } from '@/components/ui';
import { useCreateRule, useUpdateRule } from '../hooks/usePricingRules';
import { buildRuleBody, changedRuleFields, ruleValues, type RuleValues } from '../lib/ruleForm';
import { ROUNDING_OPTIONS } from '../lib/rules';
import type { PricingRule } from '../types';
import { RuleScopeFields } from './RuleScopeFields';

export interface RuleDialogProps {
  /** The rule to edit; leave out to create one. */
  rule?: PricingRule;
  onClose: () => void;
}

/** Creates a rule, or edits the one it is given. */
export function RuleDialog({ rule, onClose }: RuleDialogProps) {
  const create = useCreateRule();
  const update = useUpdateRule();
  const form = useForm<RuleValues>({ defaultValues: ruleValues(rule) });
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const scope = watch('scope');

  const submit = dialogSubmit(
    form,
    async (values) => {
      const built = buildRuleBody(values);
      if ('error' in built) {
        form.setError(built.field, { type: 'validate', message: built.error }, { shouldFocus: true });
        return false;
      }
      if (!rule) {
        await create.mutateAsync(built.body);
        return;
      }
      const body = changedRuleFields(built.body, rule);
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ rule, body });
    },
    // Every name here has an error line under its input; the target has none for a rule on every service.
    { fields: Object.keys(ruleValues()).filter((name) => scope !== 'global' || name !== 'targetId') },
  );

  return (
    <FormDialog
      open
      size="lg"
      title={rule ? 'Edit rule' : 'New rule'}
      sub="A rule changes the price of new orders only."
      confirm={rule ? 'Save rule' : 'Add rule'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <RuleScopeFields form={form} rule={rule} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Percentage"
            inputMode="decimal"
            autoComplete="off"
            hint="For example 2 for 2%. The type says whether it adds or takes."
            error={errors.percent}
            {...register('percent')}
          />
          <TextField
            label="Fixed amount (USD)"
            inputMode="decimal"
            autoComplete="off"
            hint="Use one or both."
            error={errors.fixed}
            {...register('fixed')}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Rounding"
            selectWrapClassName="w-full"
            options={ROUNDING_OPTIONS}
            error={errors.rounding}
            {...register('rounding')}
          />
          <TextField
            label="Minimum profit (USD)"
            inputMode="decimal"
            autoComplete="off"
            hint="Optional."
            error={errors.minProfit}
            {...register('minProfit')}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField
            label="Priority"
            inputMode="numeric"
            autoComplete="off"
            hint="Decides the order when rules overlap."
            error={errors.priority}
            {...register('priority')}
          />
          <TextField
            label="Starts"
            type="date"
            hint="Optional."
            error={errors.startsAt}
            {...register('startsAt')}
          />
          <TextField
            label="Ends"
            type="date"
            hint="Optional."
            error={errors.endsAt}
            {...register('endsAt')}
          />
        </div>
      </div>
    </FormDialog>
  );
}
