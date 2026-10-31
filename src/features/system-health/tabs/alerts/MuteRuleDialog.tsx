// MuteRuleDialog: silence an alert rule until a date and time (`PATCH /admin/alert-rules/:id` with `mutedUntil`,
// `alerts:update`). The effect is on screen before the confirm button. No demo page.
import { useForm } from 'react-hook-form';
import { Button, FormDialog, Icon, TextField, dialogSubmit } from '@/components/ui';
import { fromLocalInput } from '../../lib';
import { useUpdateAlertRule } from '../../hooks';
import type { AlertRule } from '../../types';
import { MUTE_PRESETS, localInputIn } from './rules';

type Values = { until: string };

export interface MuteRuleDialogProps {
  rule: AlertRule;
  onClose: () => void;
}

/**
 * Nothing is chosen for the staff member: silencing a rule is a decision, so the end time is typed or picked from the
 * quick choices. A time that is not in the future is refused by the server and the message shows under the field.
 */
export function MuteRuleDialog({ rule, onClose }: MuteRuleDialogProps) {
  const update = useUpdateAlertRule({ toastErrors: false });
  const form = useForm<Values>({ defaultValues: { until: '' } });
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const mutedUntil = fromLocalInput(values.until);
      if (!mutedUntil) return 'Choose when the mute ends.';
      await update.mutateAsync({ id: rule.id, body: { mutedUntil } });
    },
    { fields: ['until'], aliases: { mutedUntil: 'until' } },
  );

  return (
    <FormDialog
      open
      title="Mute rule"
      sub={rule.name}
      confirm="Mute rule"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <p className="flex gap-2 rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg" role="note">
          <Icon name="alert" className="ic-sm mt-0.5 flex-none" />
          <span>
            Stops this rule from sending messages until the time you choose, then it alerts again by itself.
            You can unmute it sooner.
          </span>
        </p>
        <TextField
          label="Muted until"
          type="datetime-local"
          hint="In your time zone."
          error={errors.until}
          {...register('until', { required: 'Choose when the mute ends.' })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink3">Quick choice</span>
          {MUTE_PRESETS.map((preset) => (
            <Button
              key={preset.hours}
              size="sm"
              onClick={() =>
                setValue('until', localInputIn(preset.hours, Date.now()), { shouldValidate: true })
              }
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
    </FormDialog>
  );
}
