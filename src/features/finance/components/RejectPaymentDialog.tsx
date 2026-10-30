// RejectPaymentDialog: "Reject PAY-…": a reason from a short list plus a message the merchant sees. Ports the `pay-reject`
// action of 45-p-finance.js. The two become the one reason the server stores; a server refusal shows in the dialog.
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextareaField, dialogSubmit } from '@/components/ui';
import { money } from '@/lib/format';
import { useRejectPayment } from '../hooks/usePaymentMutations';
import { paymentLabel, REJECT_REASONS, rejectReason } from '../lib/payments';
import type { Payment } from '../types';

type Values = { reason: string; message: string };

const REASON_OPTIONS = [{ value: '', label: 'Choose a reason' }, ...REJECT_REASONS];

export interface RejectPaymentDialogProps {
  payment: Payment;
  /** Cancel: back to the review dialog. */
  onCancel: () => void;
  /** The deposit was rejected: leave the review. */
  onRejected: () => void;
}

export function RejectPaymentDialog({ payment, onCancel, onRejected }: RejectPaymentDialogProps) {
  const reject = useRejectPayment();
  const form = useForm<Values>({ defaultValues: { reason: '', message: '' } });
  const {
    register,
    formState: { errors },
  } = form;
  // The dialog calls one `onClose` for both Cancel and a finished submit; this tells them apart.
  const done = useRef(false);

  const submit = dialogSubmit(
    form,
    async (values) => {
      await reject.mutateAsync({ payment, reason: rejectReason(values.reason, values.message) });
      done.current = true;
    },
    { fields: ['reason', 'message'] },
  );

  return (
    <FormDialog
      open
      title={`Reject ${paymentLabel(payment.id)}`}
      sub={`${payment.client?.name ?? 'Merchant'} · ${money(payment.amount)}`}
      confirm="Reject deposit"
      kind="danger"
      onClose={() => (done.current ? onRejected() : onCancel())}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <SelectField
          label="Reason"
          selectWrapClassName="w-full"
          options={REASON_OPTIONS}
          error={errors.reason}
          {...register('reason', { required: 'Choose a reason so the merchant knows what to fix.' })}
        />
        <TextareaField
          label="Message to merchant"
          placeholder="Visible to the merchant"
          {...register('message')}
        />
        <p className="text-xs text-ink3">
          The merchant’s wallet is not changed. They see the reason and can submit a new deposit.
        </p>
      </div>
    </FormDialog>
  );
}
