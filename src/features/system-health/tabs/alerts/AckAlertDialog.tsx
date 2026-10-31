// AckAlertDialog: acknowledge a firing alert with an optional note (`POST /admin/alerts/:id/ack`, `alerts:update`). The
// effect is on screen before the confirm button. No demo page (docs/system-health-design.md, "Controls and confirmation").
import { useForm } from 'react-hook-form';
import { FormDialog, TextareaField, dialogSubmit } from '@/components/ui';
import { ago } from '@/lib/format';
import { useAckAlert } from '../../hooks';
import type { AlertEvent } from '../../types';
import { conditionText, subjectText } from './condition';

type Values = { note: string };

export interface AckAlertDialogProps {
  alert: AlertEvent;
  onClose: () => void;
}

/**
 * The note is optional and goes to the server as typed (trimmed); an empty note sends no `note`. A refusal (the alert was
 * acknowledged or resolved meanwhile, a note that is too long) shows in the dialog, under the note when it names it.
 */
export function AckAlertDialog({ alert, onClose }: AckAlertDialogProps) {
  const ack = useAckAlert({ toastErrors: false });
  const form = useForm<Values>({ defaultValues: { note: '' } });
  const subject = subjectText(alert);

  const submit = dialogSubmit(
    form,
    async (values) => {
      const note = values.note.trim();
      await ack.mutateAsync({ id: alert.id, body: note ? { note } : {} });
    },
    { fields: ['note'] },
  );

  return (
    <FormDialog
      open
      title="Acknowledge alert"
      sub={`${alert.rule.name} · ${subject.name}`}
      confirm="Acknowledge"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <p className="text-sm text-ink2">
          <span className="tabular-nums">{conditionText(alert.value, alert.rule)}</span>
          {alert.startedAt ? `, started ${ago(alert.startedAt)}` : ''}.
        </p>
        <p className="rounded-md bg-sunken p-2.5 text-sm" role="note">
          Stops the reminders; your name and the time are recorded.
        </p>
        <TextareaField
          label="Note (optional)"
          rows={3}
          hint="Shown with the alert, up to 500 characters."
          error={form.formState.errors.note}
          {...form.register('note')}
        />
      </div>
    </FormDialog>
  );
}
