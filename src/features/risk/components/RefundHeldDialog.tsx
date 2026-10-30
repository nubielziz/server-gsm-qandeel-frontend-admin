// RefundHeldDialog: "Refund SF-20490?" or "Refund and block SF-20490?" for a held order (the demo's `rk-refund` confirm). The
// money goes back and the supplier is never contacted. Two options add the customer's email and/or the device to the
// blocklist; the "Refund and block" button opens it with the email ticked. The title and button follow the ticks.
import { useForm } from 'react-hook-form';
import { CheckboxField, dialogSubmit, FormDialog, TextField } from '@/components/ui';
import { orderLabel } from '@/features/orders';
import { fmtImei, lm, maskEmail } from '@/lib/format';
import { useRefundHeldOrder } from '../hooks/useRiskDecisions';
import { defaultRefundReason, refundDestination } from '../lib/queue';
import type { HeldOrder } from '../types';

type Values = { reason: string; blockEmail: boolean; blockDevice: boolean };

export interface RefundHeldDialogProps {
  order: HeldOrder;
  /** Open with the customer's email ticked (the "Refund and block" button). */
  block: boolean;
  onClose: () => void;
}

// What the customer can do afterwards, in the demo's words.
function consequence(name: string, values: Pick<Values, 'blockEmail' | 'blockDevice'>): string {
  if (values.blockEmail) return `${name} is blocked: their email can’t place another order.`;
  if (values.blockDevice) return 'This device can’t be ordered for again.';
  return 'They can still order again later.';
}

export function RefundHeldDialog({ order, block, onClose }: RefundHeldDialogProps) {
  const refund = useRefundHeldOrder();
  const { customer } = order;
  const form = useForm<Values>({
    defaultValues: { reason: defaultRefundReason(order.signals), blockEmail: block, blockDevice: false },
  });
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const [blockEmail, blockDevice] = watch(['blockEmail', 'blockDevice']);
  const blocking = blockEmail || blockDevice;

  const submit = dialogSubmit(
    form,
    async (values) => {
      await refund.mutateAsync({
        order,
        body: {
          reason: values.reason.trim() || undefined,
          blockEmail: values.blockEmail,
          blockDevice: values.blockDevice,
        },
      });
    },
    { fields: ['reason', 'blockEmail', 'blockDevice'] },
  );

  return (
    <FormDialog
      open
      title={`${blocking ? 'Refund and block' : 'Refund'} ${orderLabel({ id: order.orderId, channel: 'b2c' })}?`}
      confirm={blocking ? 'Refund and block' : 'Refund'}
      kind="danger"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3 text-sm text-ink2">
        <p>
          {lm(order.capturedAmount, order.currency, order.fxRate)} goes back to {customer.name}’s{' '}
          {refundDestination(order.paymentMethod)}. The supplier is never contacted.
        </p>
        <TextField
          label="Reason"
          autoComplete="off"
          hint="Only your team sees this. It goes to the audit log and to any blocklist entry."
          error={errors.reason}
          {...register('reason')}
        />
        <div className="space-y-2">
          <CheckboxField
            label="Block the customer’s email"
            hint={maskEmail(customer.email)}
            error={errors.blockEmail}
            {...register('blockEmail')}
          />
          <CheckboxField
            label="Block the device"
            hint={`IMEI ${fmtImei(order.imei)}`}
            error={errors.blockDevice}
            {...register('blockDevice')}
          />
        </div>
        <p>{consequence(customer.name, { blockEmail, blockDevice })}</p>
      </div>
    </FormDialog>
  );
}
