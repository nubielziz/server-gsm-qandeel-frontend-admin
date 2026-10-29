// RefundDialog: "Refund <order>" for a completed merchant order (`POST /admin/orders/:id/refund`). Ports the o-refund
// dialog of 41-p-orders.js, which refunded a storefront order with an amount; the map refunds merchant orders in full from
// here and sends storefront refunds to the Refunds page (MISMATCHES M25).
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, Icon, TextField } from '@/components/ui';
import { money } from '@/lib/format';
import { useRefundOrder } from '../hooks/useOrderMutations';
import { orderLabel } from '../lib/status';
import type { Order } from '../types';

type Values = { reason: string };

export interface RefundDialogProps {
  order: Order;
  onClose: () => void;
  onViewLedger?: (order: Order) => void;
}

export function RefundDialog({ order, onClose, onViewLedger }: RefundDialogProps) {
  const refund = useRefundOrder({ onViewLedger });
  const form = useForm<Values>({ defaultValues: { reason: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      await refund.mutateAsync({ order, body: { reason: values.reason.trim() } });
    },
    { fields: ['reason'] },
  );

  return (
    <FormDialog
      open
      title={`Refund ${orderLabel(order)}`}
      sub={`${order.client?.name ?? 'The merchant'} · charged ${money(order.totalPrice)}`}
      confirm="Refund"
      kind="danger"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="Reason"
          placeholder="Goodwill, duplicate order, wrong service…"
          autoComplete="off"
          hint="The merchant sees this with the refund."
          error={errors.reason}
          {...register('reason', { validate: (value) => value.trim() !== '' || 'Add a short reason.' })}
        />
        <p className="flex gap-2 rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg">
          <Icon name="alert" className="ic-sm mt-0.5 flex-none" />
          <span>
            This order was delivered. Refunding returns {money(order.totalPrice)} to the merchant but not the{' '}
            {money(order.totalCost)} paid to the supplier.
          </span>
        </p>
      </div>
    </FormDialog>
  );
}
