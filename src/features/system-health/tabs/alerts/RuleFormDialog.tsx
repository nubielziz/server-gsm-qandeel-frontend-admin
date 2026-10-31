// RuleFormDialog: create an alert rule (`POST /admin/alert-rules`, `alerts:create`) or edit one (`PATCH
// /admin/alert-rules/:id`, `alerts:update`). The server's field messages show under their fields. No demo page.
import { Controller, useForm } from 'react-hook-form';
import { CheckboxField, FormDialog, SelectField, TextField, dialogSubmit } from '@/components/ui';
import { useCreateAlertRule, useUpdateAlertRule } from '../../hooks';
import type { AlertRule } from '../../types';
import { CheckGroup } from './CheckGroup';
import { windowText } from './condition';
import { filled } from './filled';
import {
  BLANK_RULE,
  CHANNEL_OPTIONS,
  COMPARATOR_OPTIONS,
  RULE_SEVERITY_OPTIONS,
  metricOptions,
  ruleValues,
  toCreateBody,
  toUpdateBody,
  unitHint,
  withCurrent,
  type RuleValues,
} from './rules';

// The form's field names: a server message about any other field shows in the dialog's error slot (`dialogSubmit`).
const FIELDS = [
  'name',
  'key',
  'metric',
  'comparator',
  'threshold',
  'windowSeconds',
  'severity',
  'channels',
  'isActive',
] as const;

const isNumber = (value: string) =>
  (value.trim() !== '' && Number.isFinite(Number(value))) || 'Enter a number.';

export interface RuleFormDialogProps {
  /** The rule to edit. Leave out to create a new one. */
  rule?: AlertRule;
  onClose: () => void;
}

/**
 * An edit sends only the fields that changed, and nothing at all when none did. The client asks only for something in
 * each field; the server's limits (key format and uniqueness, name length, a window of 60 to 86,400 seconds, a known
 * metric) come back under the field they belong to.
 */
export function RuleFormDialog({ rule, onClose }: RuleFormDialogProps) {
  const create = useCreateAlertRule({ toastErrors: false });
  const update = useUpdateAlertRule({ toastErrors: false });
  const form = useForm<RuleValues>({ defaultValues: rule ? ruleValues(rule) : BLANK_RULE });
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const unit = unitHint(watch('metric'));
  const seconds = Number(watch('windowSeconds'));

  const submit = dialogSubmit(
    form,
    async (values) => {
      if (!rule) {
        await create.mutateAsync(toCreateBody(values));
        return;
      }
      const body = toUpdateBody(rule, values);
      if (Object.keys(body).length > 0) await update.mutateAsync({ id: rule.id, body });
    },
    { fields: FIELDS },
  );

  return (
    <FormDialog
      open
      title={rule ? 'Edit alert rule' : 'New alert rule'}
      sub={rule ? `Rule ${rule.key}` : 'Be told when a metric crosses a limit.'}
      confirm={rule ? 'Save changes' : 'Create rule'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="Name"
          error={errors.name}
          {...register('name', { validate: filled('Enter a name.') })}
        />
        <TextField
          label="Key"
          className="mono"
          hint="Lowercase letters, digits and underscores. It names the rule in messages."
          error={errors.key}
          {...register('key', { validate: filled('Enter a key.') })}
        />
        <SelectField
          label="Metric"
          options={metricOptions(rule?.metric)}
          selectWrapClassName="w-full"
          error={errors.metric}
          {...register('metric', { validate: filled('Choose a metric.') })}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField
            label="Fires when it is"
            options={withCurrent(COMPARATOR_OPTIONS, rule?.comparator)}
            selectWrapClassName="w-full"
            error={errors.comparator}
            {...register('comparator')}
          />
          <TextField
            label="Threshold"
            type="number"
            step="any"
            inputMode="decimal"
            hint={unit ? `In ${unit}.` : undefined}
            error={errors.threshold}
            {...register('threshold', { validate: isNumber })}
          />
          <TextField
            label="For (seconds)"
            type="number"
            inputMode="numeric"
            hint={`60 to 86,400${seconds > 0 ? ` · ${windowText(seconds)}` : ''}`}
            error={errors.windowSeconds}
            {...register('windowSeconds', { validate: isNumber })}
          />
        </div>
        <SelectField
          label="Severity"
          options={withCurrent(RULE_SEVERITY_OPTIONS, rule?.severity)}
          selectWrapClassName="w-full"
          error={errors.severity}
          {...register('severity')}
        />
        <Controller
          name="channels"
          control={control}
          rules={{ validate: (value) => value.length > 0 || 'Choose at least one channel.' }}
          render={({ field, fieldState }) => (
            <CheckGroup
              legend="Send messages to"
              options={CHANNEL_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              listClassName="flex gap-4"
            />
          )}
        />
        <CheckboxField
          label="Active"
          hint="A switched-off rule does not alert."
          error={errors.isActive}
          {...register('isActive')}
        />
        <p className="rounded-md bg-sunken p-2.5 text-sm" role="note">
          {rule
            ? 'Changes apply from the next check.'
            : 'Once saved, the server checks this rule and sends a message to the channels you choose when it fires.'}
        </p>
      </div>
    </FormDialog>
  );
}
