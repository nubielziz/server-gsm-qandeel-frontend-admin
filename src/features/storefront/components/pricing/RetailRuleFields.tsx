// RetailRuleFields: step one of the retail pricing rule dialog: what the rule covers (fixed when a rule is edited), the margin, a
// fixed amount, the rounding, the price from which rounding applies and how far a cost may move before a change waits. The
// hints are the plan's words; every refusal of a figure is the server's and shows under its field.
import type { UseFormReturn } from 'react-hook-form';
import { SelectField, TextField } from '@/components/ui';
import { ROUNDING_OPTIONS, SCOPE_OPTIONS, TYPE_OPTIONS } from '../../lib/retailPricing';
import type { RuleValues } from '../../lib/retailRuleForm';
import type { RetailPriceRule } from '../../types';
import { RetailCategoryField } from './RetailCategoryField';

export interface RetailRuleFieldsProps {
  form: UseFormReturn<RuleValues>;
  /** The rule being edited: what it covers is shown and cannot change. */
  rule?: RetailPriceRule;
}

/** The form step of the rule dialog. */
export function RetailRuleFields({ form, rule }: RetailRuleFieldsProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const scope = watch('scope');
  const editing = rule !== undefined;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Applies to"
          selectWrapClassName="w-full"
          options={SCOPE_OPTIONS}
          disabled={editing}
          error={errors.scope}
          {...register('scope', { onChange: () => setValue('categoryId', '') })}
        />
        {scope === 'type' && (
          <SelectField
            label="Service type"
            selectWrapClassName="w-full"
            options={[{ value: '', label: 'Choose a type' }, ...TYPE_OPTIONS]}
            disabled={editing}
            error={errors.serviceType}
            {...register('serviceType')}
          />
        )}
        {scope === 'category' && <RetailCategoryField form={form} rule={rule} />}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Margin (%)"
          inputMode="decimal"
          autoComplete="off"
          hint="Added to the cost. For example 30 for 30%."
          error={errors.percent}
          {...register('percent')}
        />
        <TextField
          label="Plus a fixed amount (USD)"
          inputMode="decimal"
          autoComplete="off"
          hint="Optional. Added after the margin."
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
          label="Round prices from (USD)"
          inputMode="decimal"
          autoComplete="off"
          hint="Cheaper prices stay in whole cents, so a $0.20 check is not sold at $0.99."
          error={errors.roundFrom}
          {...register('roundFrom')}
        />
      </div>
      <TextField
        label="Follow cost changes up to (%)"
        inputMode="numeric"
        autoComplete="off"
        wrapperClassName="sm:max-w-[50%]"
        hint="A bigger change waits for your approval. 0 means every change waits."
        error={errors.autoFollowPercent}
        {...register('autoFollowPercent')}
      />
    </div>
  );
}
