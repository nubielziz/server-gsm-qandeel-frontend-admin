// UpdateIncidentDialog: post an update on an incident, with a status and a text (`PATCH /admin/incidents/:id`,
// `incidents:update`). The server writes the timeline line with the staff member and the time. No demo page.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextareaField, dialogSubmit } from '@/components/ui';
import { useUpdateIncident } from '../../hooks';
import type { Incident, IncidentStatus } from '../../types';
import { filled } from './filled';
import { UPDATE_STATUS_OPTIONS, updateStatusFor } from './incidents';

type Values = { status: IncidentStatus; update: string };

export interface UpdateIncidentDialogProps {
  incident: Incident;
  onClose: () => void;
}

/**
 * The status starts on the incident's own, so an update that only adds a line changes nothing else. Resolved is not a
 * choice: closing is its own dialog because it asks for the root cause.
 */
export function UpdateIncidentDialog({ incident, onClose }: UpdateIncidentDialogProps) {
  const update = useUpdateIncident({ toastErrors: false });
  const form = useForm<Values>({ defaultValues: { status: updateStatusFor(incident.status), update: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      await update.mutateAsync({
        id: incident.id,
        body: { status: values.status, update: values.update.trim() },
      });
    },
    { fields: ['status', 'update'] },
  );

  return (
    <FormDialog
      open
      title="Post update"
      sub={incident.title}
      confirm="Post update"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <SelectField
          label="Status"
          options={UPDATE_STATUS_OPTIONS}
          selectWrapClassName="w-full"
          error={errors.status}
          {...register('status')}
        />
        <TextareaField
          label="Update"
          rows={3}
          hint="What changed. It goes on the timeline, up to 1,000 characters."
          error={errors.update}
          {...register('update', { validate: filled('Write what changed.') })}
        />
        <p className="rounded-md bg-sunken p-2.5 text-sm" role="note">
          Adds a line to the timeline with your name and the time.
        </p>
      </div>
    </FormDialog>
  );
}
