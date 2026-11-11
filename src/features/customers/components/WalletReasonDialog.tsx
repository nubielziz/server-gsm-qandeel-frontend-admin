// WalletReasonDialog: the dialog behind both "Put on hold" and "Lift hold": one reason of 5 to 200 characters that goes to the
// audit log. The two wrappers (FreezeWalletDialog, UnfreezeWalletDialog) give it their words and their action. The Idempotency-Key is
// made once when the dialog opens and sent with every retry of that opening.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormDialog, TextareaField, dialogSubmit } from '@/components/ui';
import { cleanReason, newIdempotencyKey } from '../lib/walletInput';

type Values = { reason: string };

export interface WalletReasonDialogProps {
  title: string;
  sub: string;
  confirm: string;
  kind?: 'primary' | 'danger';
  /** The sentence under the box. */
  note: string;
  /** Sends the action with this opening's key; a thrown error is shown in the dialog. */
  onSend: (reason: string, key: string) => Promise<unknown>;
  onClose: () => void;
}

/** Asks for the reason, then runs the action. The server's refusal (a negative balance, an open dispute) shows in the dialog. */
export function WalletReasonDialog({
  title,
  sub,
  confirm,
  kind,
  note,
  onSend,
  onClose,
}: WalletReasonDialogProps) {
  const [key] = useState(newIdempotencyKey);
  const form = useForm<Values>({ defaultValues: { reason: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      await onSend(cleanReason(values.reason), key);
    },
    { fields: ['reason'] },
  );

  return (
    <FormDialog
      open
      title={title}
      sub={sub}
      confirm={confirm}
      kind={kind}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextareaField
          label="Reason"
          rows={2}
          maxLength={200}
          placeholder="e.g. Checking a disputed top-up"
          error={errors.reason}
          {...register('reason', {
            validate: (value) =>
              cleanReason(value).length >= 5 ||
              'Add a reason of at least 5 characters so the action can be audited later.',
          })}
        />
        <p className="text-xs text-ink3">{note}</p>
      </div>
    </FormDialog>
  );
}
