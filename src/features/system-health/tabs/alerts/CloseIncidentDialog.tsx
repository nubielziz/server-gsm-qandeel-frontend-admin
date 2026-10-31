// CloseIncidentDialog: close an incident with its root cause (`PATCH /admin/incidents/:id`, `status: resolved`,
// `incidents:update`). The effect is on screen before the confirm button. No demo page.
import { useForm } from 'react-hook-form';
import { FormDialog, TextareaField, dialogSubmit } from '@/components/ui';
import { useUpdateIncident } from '../../hooks';
import type { Incident } from '../../types';
import { filled } from './filled';

type Values = { rootCause: string; update: string };

export interface CloseIncidentDialogProps {
  incident: Incident;
  onClose: () => void;
}

/**
 * The root cause is required. The form only asks that something is written; the server's message names the minimum length
 * (10 characters) and shows under the field. The action taken is the closing timeline line (MISMATCHES M205) and is optional.
 */
export function CloseIncidentDialog({ incident, onClose }: CloseIncidentDialogProps) {
  const update = useUpdateIncident({ toastErrors: false });
  const form = useForm<Values>({ defaultValues: { rootCause: '', update: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const action = values.update.trim();
      await update.mutateAsync({
        id: incident.id,
        body: {
          status: 'resolved',
          rootCause: values.rootCause.trim(),
          ...(action ? { update: action } : {}),
        },
      });
    },
    { fields: ['rootCause', 'update'] },
  );

  return (
    <FormDialog
      open
      title="Close incident"
      sub={incident.title}
      confirm="Close incident"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <p className="rounded-md bg-sunken p-2.5 text-sm" role="note">
          Closes the incident and writes the last line of the timeline. A closed incident is a record and
          cannot be changed.
        </p>
        <TextareaField
          label="Root cause"
          rows={3}
          hint="Required. What caused it, in at least 10 characters."
          error={errors.rootCause}
          {...register('rootCause', { validate: filled('Enter the root cause.') })}
        />
        <TextareaField
          label="Action taken (optional)"
          rows={2}
          hint="What was done to fix it. It becomes the last line of the timeline."
          error={errors.update}
          {...register('update')}
        />
      </div>
    </FormDialog>
  );
}
