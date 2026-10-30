// The two decisions on a held order, each with the toast the demo showed and the reads it makes stale. Public: another page
// that lists held orders (the order drawer) can use them. Ports `rk-approve` and `rk-refund` of 54-p-risk.js.
import { toast } from '@/components/ui';
import { orderLabel } from '@/features/orders';
import { useApiMutation } from '@/lib/query';
import { approveHeldOrder, refundHeldOrder } from '../api';
import type { HeldOrder, RefundHeldBody } from '../types';
import { DECISION_STALE_KEYS } from './keys';

const label = (order: HeldOrder) => orderLabel({ id: order.orderId, channel: 'b2c' });

/** Approve and send. A failure shows as the default error toast: the button has no dialog to show it in. */
export function useApproveHeldOrder() {
  return useApiMutation({
    mutationFn: (order: HeldOrder) => approveHeldOrder(order.orderId),
    invalidates: (_result, order) => [{ resource: 'orders', id: order.orderId }],
    invalidateKeys: DECISION_STALE_KEYS,
    successNotification: (_result, order) => ({
      message: `${label(order)} approved`,
      description: `Sent to ${order.supplier?.name ?? 'the supplier'}. The customer gets the result by email.`,
    }),
  });
}

/** The order and what to do besides the refund. */
export type RefundHeldInput = { order: HeldOrder; body: RefundHeldBody };

/** Refund, and optionally block the email and/or the device. The refund dialog shows a failed call itself. */
export function useRefundHeldOrder() {
  return useApiMutation({
    mutationFn: ({ order, body }: RefundHeldInput) => refundHeldOrder(order.orderId, body),
    invalidates: (_result, { order, body }) => [
      { resource: 'orders', id: order.orderId },
      { resource: 'blocklist' },
      // Blocking an email can change the customer's standing, so the customer's own page is read again.
      ...(body.blockEmail ? [{ resource: 'customers', id: order.customer.id }] : []),
    ],
    invalidateKeys: DECISION_STALE_KEYS,
    // The demo told this with a quiet "info" toast, which the success notifications cannot draw.
    onSuccess: (_result, { order, body }) => {
      toast({
        kind: 'info',
        title: `${label(order)} refunded`,
        body:
          body.blockEmail || body.blockDevice
            ? `${order.customer.name} is blocked.`
            : 'The customer was told by email.',
        ttl: 3000,
      });
    },
    errorNotification: () => false,
  });
}
