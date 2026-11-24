// WalletReasonDialog: the dialog behind both "Put on hold" and "Lift hold": one reason of 5 to 200 characters that goes to the audit log. The
// two wrappers (WalletHoldDialogs) give it their words and their action. The Idempotency-Key is made once when the dialog opens and sent with every
// retry of that opening, so a double click or a retry can never act twice.
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { FormDialog, TextareaField, dialogSubmit } from '@/components/ui';
import { useDialogKey } from '../../hooks/useDialogKey';
import { HOLD_REASON_MAX, HOLD_REASON_MIN, cleanReason, reasonProblem } from './walletInput';

type Values = { reason: string };

export interface WalletReasonDialogProps {
  /** The fixed title of the action (from `dialogTitle`). */
  title: string;
  /** What the action does, above the box. */
  text: ReactNode;
  confirm: string;
  kind?: 'primary' | 'danger';
  /** The sentence under the box. */
  note?: string;
  /** Sends the action with this opening's key; a thrown error is shown in the dialog. */
  onSend: (reason: string, key: string) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Asks for the reason, then runs the action. The server's refusal (a balance below zero, an open dispute) shows in the dialog.
 *
 * @param props see `WalletReasonDialogProps`.
 * @throws nothing: a refusal stays in the dialog, which stays open.
 */
export function WalletReasonDialog({
  title,
  text,
  confirm,
  kind,
  note,
  onSend,
  onClose,
}: WalletReasonDialogProps) {
  const key = useDialogKey();
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
    <FormDialog open title={title} confirm={confirm} kind={kind} onClose={onClose} onSubmit={submit}>
      <div className="space-y-3">
        <p className="text-sm text-ink2">{text}</p>
        <TextareaField
          label="Reason"
          rows={2}
          maxLength={HOLD_REASON_MAX}
          placeholder="e.g. Checking a disputed top-up"
          hint={note}
          error={errors.reason}
          {...register('reason', {
            validate: (value) => reasonProblem(value, HOLD_REASON_MIN, HOLD_REASON_MAX, 'the action') ?? true,
          })}
        />
      </div>
    </FormDialog>
  );
}
