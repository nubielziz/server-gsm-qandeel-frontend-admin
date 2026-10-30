// RejectRequestDialog: "Reject <DSR-n>?": the note that says why a data request is refused, kept with the request for the audit
// log. A rejected request cannot be reopened from here, so the note is asked for before the click.
import { useForm } from 'react-hook-form';
import { FormDialog, TextareaField, dialogSubmit } from '@/components/ui';
import { useUpdateDataRequest } from '../hooks/usePrivacyMutations';
import { requestKindLabel, requestNumber } from '../lib/requests';
import type { DataRequest } from '../types';

type Values = { note: string };

export interface RejectRequestDialogProps {
  request: DataRequest;
  onClose: () => void;
}

/** Rejects a request with a note. A refusal from the server shows in the dialog. */
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

  return (
    <FormDialog
      open
      title={`Reject ${requestNumber(request.id)}?`}
      sub={`${request.customerName}’s ${requestKindLabel(request.kind).toLowerCase()} request.`}
      confirm="Reject request"
      kind="danger"
      onClose={onClose}
      onSubmit={submit}
    >
      <TextareaField
        label="Note"
        rows={3}
        maxLength={300}
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
