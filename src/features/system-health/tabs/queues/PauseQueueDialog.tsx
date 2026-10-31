// PauseQueueDialog: pause a queue (`POST /admin/system/queues/:name/pause`, `system:manage`). It says what a pause does
// before the button and asks for the reason that goes to the audit log. A refusal about the reason shows under its box,
// any other refusal in the dialog's error slot.
import { useForm } from 'react-hook-form';
import { FormDialog, TextField, dialogSubmit } from '@/components/ui';
import { usePauseQueue } from '../../hooks';

type Values = { reason: string };

export interface PauseQueueDialogProps {
  queue: string;
  onClose: () => void;
}

/**
 * A pause stops work during an incident, so the reason is required (the server insists on it too, and a field error from
 * it shows under the box). `fields` lists only what the form draws: the body also has `paused`, but no input, so a server
 * message about it must not land on a field nobody sees. It falls to the error slot as "paused: …" and the dialog stays
 * open. A dialog answers the write, so the mutation does not toast errors.
 */
export function PauseQueueDialog({ queue, onClose }: PauseQueueDialogProps) {
  const pause = usePauseQueue({ toastErrors: false });
  const form = useForm<Values>({ defaultValues: { reason: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async ({ reason }) => {
      await pause.mutateAsync({ queue, body: { paused: true, reason: reason.trim() } });
    },
    { fields: ['reason'] },
  );

  return (
    <FormDialog
      open
      title={
        <>
          Pause <span className="mono">{queue}</span>?
        </>
      }
      confirm="Pause queue"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <p className="text-sm text-ink2">
          Workers stop taking jobs from <span className="mono">{queue}</span>; waiting jobs stay queued.
        </p>
        <TextField
          label="Reason"
          hint="Goes to the audit log."
          autoComplete="off"
          error={errors.reason}
          {...register('reason', {
            validate: (value) => value.trim().length > 0 || 'Say why you are pausing this queue.',
          })}
        />
      </div>
    </FormDialog>
  );
}
