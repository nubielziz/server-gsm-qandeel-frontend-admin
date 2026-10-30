// DeclineRefundDialog: "Decline <refund>" with the message the customer gets by email. Ports the rf-decline dialog of
// 53-p-refunds.js: a message that is prefilled with the demo's wording and must be at least a sentence. The server's refusal
// (or a field message) shows in the dialog.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, TextareaField } from '@/components/ui';
import { fmtDay, lm } from '@/lib/format';
import { useDeclineRefund } from '../hooks/useRefundMutations';
import { refundLabel, storefrontOrderLabel } from '../lib/labels';
import type { Refund } from '../types';

type Values = { reason: string };

// The demo's suggested message for an unlock that was delivered.
const SUGGESTION =
  'Your unlock was delivered and the service started at your request, so under our refund policy it can’t be refunded. If the phone is still locked, reply with a photo of the message and we will check it again.';

export interface DeclineRefundDialogProps {
  refund: Refund;
  onClose: () => void;
}

export function DeclineRefundDialog({ refund, onClose }: DeclineRefundDialogProps) {
  const decline = useDeclineRefund();
  const form = useForm<Values>({ defaultValues: { reason: SUGGESTION } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      await decline.mutateAsync({ refund, body: { reason: values.reason.trim() } });
    },
    { fields: ['reason'] },
  );

  return (
    <FormDialog
      open
      title={`Decline ${refundLabel(refund.id)}`}
      sub={`${storefrontOrderLabel(refund.order.id)} · ${lm(refund.amount, refund.currency, refund.fx)}`}
      confirm="Decline request"
      kind="danger"
      onClose={onClose}
      onSubmit={submit}
    >
      <TextareaField
        label="Message to the customer"
        rows={3}
        placeholder={`The order was delivered on ${fmtDay(refund.order.deliveredAt ?? refund.createdAt)}, so under our terms it can’t be refunded…`}
        hint="Sent by email. The reason is also kept with the order."
        error={errors.reason}
        {...register('reason', {
          validate: (value) =>
            value.trim().length >= 10 || 'Give the customer a reason, at least a sentence.',
        })}
      />
    </FormDialog>
  );
}
