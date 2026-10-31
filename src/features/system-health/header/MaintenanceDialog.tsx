// MaintenanceDialog: turn maintenance on, or change a running one (`PUT /admin/system/maintenance`, `system:manage`). The
// staff member picks what to close, writes the message customers see and may set an expected end. The effect sentence
// is on screen before the confirm button. No demo page (docs/system-health-design.md, "Controls and confirmation").
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  FormDialog,
  Icon,
  RadioGroup,
  TextField,
  TextareaField,
  dialogSubmit,
} from '@/components/ui';
import { useSetMaintenance } from '../hooks';
import type { MaintenanceScope, MaintenanceState } from '../types';
import {
  SCOPE_OPTIONS,
  effectSentence,
  fromLocalInput,
  scopePhrase,
  toLocalInput,
  whenText,
} from './maintenance';

type Values = { scope: MaintenanceScope | ''; message: string; end: string };

const FIELDS = ['scope', 'message', 'end'] as const;

const SCOPE_RADIOS = SCOPE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
  description: option.description,
}));

/** The line above the form that says what is running now, with the way to turn it off. */
function StateRow({ children, onTurnOff }: { children: ReactNode; onTurnOff: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-sunken p-2.5 text-sm">
      <p>{children}</p>
      <Button size="sm" onClick={onTurnOff}>
        Turn off maintenance
      </Button>
    </div>
  );
}

export interface MaintenanceDialogProps {
  /**
   * The state the health read reported. Undefined when the read failed or has not arrived: the dialog then says the
   * state is unknown and still offers "Turn off", so a failed read never locks maintenance on.
   */
  current: MaintenanceState | undefined;
  onClose: () => void;
  /** Asks the page to swap this dialog for the separate "Turn off" confirm. */
  onTurnOff: () => void;
}

/**
 * Nothing is chosen for the staff member when maintenance is off: the scope must be picked, so a hurried click cannot close
 * more than intended. When maintenance is already on, the form starts from the running values and a "Turn off" button
 * opens its own confirm. A refusal of the server shows under the field it names, or in the dialog.
 */
export function MaintenanceDialog({ current, onClose, onTurnOff }: MaintenanceDialogProps) {
  const setMaintenance = useSetMaintenance({ toastErrors: false });
  const running = current?.enabled ? current : null;
  const form = useForm<Values>({
    defaultValues: {
      scope: running?.scope ?? '',
      message: running?.message ?? '',
      end: toLocalInput(running?.expectedEndAt),
    },
  });
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const scope = watch('scope');

  const submit = dialogSubmit(
    form,
    async (values) => {
      // The scope is required by the form, so this only narrows the type.
      if (values.scope === '') return false;
      await setMaintenance.mutateAsync({
        enabled: true,
        scope: values.scope,
        message: values.message.trim(),
        expectedEndAt: fromLocalInput(values.end),
      });
    },
    { fields: FIELDS, aliases: { expectedEndAt: 'end' } },
  );

  return (
    <FormDialog
      open
      title="Maintenance mode"
      sub="Close part of the platform to customers while you work."
      confirm={running ? 'Save changes' : 'Turn on maintenance'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        {running && (
          <StateRow onTurnOff={onTurnOff}>
            Maintenance is on for {scopePhrase(running.scope)}
            {running.startedAt ? ` since ${whenText(running.startedAt)}` : ''}
            {running.startedBy ? ` (started by ${running.startedBy.name})` : ''}.
          </StateRow>
        )}
        {current === undefined && (
          <StateRow onTurnOff={onTurnOff}>
            The current state could not be read. If maintenance is on, you can still turn it off.
          </StateRow>
        )}
        <RadioGroup
          legend="What to close"
          options={SCOPE_RADIOS}
          highlight
          listClassName="grid gap-2 sm:grid-cols-2"
          error={errors.scope}
          {...register('scope', { required: 'Choose what to close.' })}
        />
        <TextareaField
          label="Message for customers"
          rows={3}
          hint="Customers see this with the 503 MAINTENANCE answer."
          error={errors.message}
          {...register('message', {
            validate: (value) => value.trim().length > 0 || 'Write the message customers will see.',
          })}
        />
        <TextField
          label="Expected end (optional)"
          type="datetime-local"
          hint="When you expect to be done, in your time zone."
          error={errors.end}
          {...register('end')}
        />
        <p className="flex gap-2 rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg" role="note">
          <Icon name="alert" className="ic-sm mt-0.5 flex-none" />
          <span>{effectSentence(scope)}</span>
        </p>
      </div>
    </FormDialog>
  );
}
