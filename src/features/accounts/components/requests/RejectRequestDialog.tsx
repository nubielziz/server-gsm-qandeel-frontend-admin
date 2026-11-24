// RejectRequestDialog: "Reject DSR-<n>?": the note that says why a data request is refused, kept with the request for the audit log. A
// rejected request cannot be reopened from here, so the note is asked for before the click. The server's refusal stays in the dialog.
import { useForm } from 'react-hook-form';
import { FormDialog, TextareaField, dialogSubmit } from '@/components/ui';
import { accountLabel } from '@/lib/format';
import { useUpdateDataRequest } from '../../hooks/useDataRequests';
import type { DataRequest } from '../../types';
import { requestKindLabel, requestNumber } from './requestWords';

type Values = { note: string };

/** The longest note the dialog takes. */
const NOTE_MAX = 300;

export interface RejectRequestDialogProps {
  request: DataRequest;
  onClose: () => void;
}

/**
 * Rejects a data request with a note (required). A refusal from the server shows in the dialog, not as a toast.
 *
 * @param props.request the request to refuse (open or in progress).
 * @param props.onClose asks to close the dialog (done, or cancelled).
 * @see PATCH /admin/data-requests/:id
 */
export function RejectRequestDialog({ request, onClose }: RejectRequestDialogProps) {
  const update = useUpdateDataRequest({ toastErrors: false });
  const form = useForm<Values>({ defaultValues: { note: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      await update.mutateAsync({ request, body: { status: 'rejected', note: values.note.trim() } });
    },
    { fields: ['note'] },
  );

  const who = accountLabel({ id: request.accountId, name: request.accountName });
  return (
    <FormDialog
      open
      title={`Reject ${requestNumber(request.id)}?`}
      sub={`${who}’s ${requestKindLabel(request.kind).toLowerCase()} request.`}
      confirm="Reject request"
      kind="danger"
      onClose={onClose}
      onSubmit={submit}
    >
      <TextareaField
        label="Note"
        rows={3}
        maxLength={NOTE_MAX}
        placeholder="Why is it refused?"
        hint="Kept with the request so the next person knows why."
        error={errors.note}
        {...register('note', {
          validate: (value) => value.trim() !== '' || 'Say why the request is refused.',
        })}
      />
    </FormDialog>
  );
}
