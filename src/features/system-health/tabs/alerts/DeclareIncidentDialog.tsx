// DeclareIncidentDialog: declare an incident, on its own or prefilled from an alert (`POST /admin/incidents`,
// `incidents:create`). The effect is on screen before the confirm button. No demo page (design: "Controls and confirmation").
import { Controller, useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextField, TextareaField, dialogSubmit } from '@/components/ui';
import { useCreateIncident } from '../../hooks';
import type { AlertEvent } from '../../types';
import { ComponentsField } from './ComponentsField';
import { filled } from './filled';
import { BLANK_INCIDENT, INCIDENT_SEVERITY_OPTIONS, declareDefaults, type DeclareValues } from './incidents';

// The form's field names: a server message about any other field shows in the dialog's error slot (`dialogSubmit`).
const FIELDS = ['title', 'severity', 'components', 'summary'] as const;

export interface DeclareIncidentDialogProps {
  /** The alert the incident starts from; its rule, subject and severity prefill the form. Leave out for a blank form. */
  alert?: AlertEvent;
  onClose: () => void;
}

/**
 * The form starts from the alert when there is one (the server links the two with `alertEventId`) and the staff member
 * edits everything. The client only asks for something in each field; the server's own limits (title 3 to 120 characters,
 * a summary of 10 or more, known component keys) come back under the field they belong to.
 */
export function DeclareIncidentDialog({ alert, onClose }: DeclareIncidentDialogProps) {
  const create = useCreateIncident({ toastErrors: false });
  const initial = alert ? declareDefaults(alert) : BLANK_INCIDENT;
  const form = useForm<DeclareValues>({ defaultValues: initial });
  const {
    register,
    control,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      await create.mutateAsync({
        title: values.title.trim(),
        severity: values.severity,
        components: values.components,
        summary: values.summary.trim(),
        ...(alert ? { alertEventId: alert.id } : {}),
      });
    },
    { fields: FIELDS },
  );

  return (
    <FormDialog
      open
      title="Declare incident"
      sub={alert ? `From alert #${alert.id}: ${alert.rule.name}` : undefined}
      confirm="Declare incident"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="Title"
          error={errors.title}
          {...register('title', { validate: filled('Enter a title.') })}
        />
        <SelectField
          label="Severity"
          options={INCIDENT_SEVERITY_OPTIONS}
          selectWrapClassName="w-full"
          error={errors.severity}
          {...register('severity')}
        />
        <Controller
          name="components"
          control={control}
          rules={{ validate: (value) => value.length > 0 || 'Choose at least one affected component.' }}
          render={({ field, fieldState }) => (
            <ComponentsField
              value={field.value}
              onChange={field.onChange}
              initial={initial.components}
              error={fieldState.error?.message}
            />
          )}
        />
        <TextareaField
          label="Summary"
          rows={3}
          hint="What is happening and who is affected."
          error={errors.summary}
          {...register('summary', { validate: filled('Describe what is happening.') })}
        />
        <p className="rounded-md bg-sunken p-2.5 text-sm" role="note">
          The incident starts at Investigating and shows on the System health verdict until you close it. Your
          name and the time are recorded.
        </p>
      </div>
    </FormDialog>
  );
}
