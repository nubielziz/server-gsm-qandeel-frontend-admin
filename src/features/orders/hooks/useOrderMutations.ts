// The actions on one order, each with the toast the demo showed and the reads it makes stale. Ports the toasts of
// completeOrders / doRetry / the refund dialog in 41-p-orders.js. Hooks used from a dialog or a form (`reopen`, `refund`,
// `verification`, `note`, and `reply` with `quiet`) leave a failed call to that dialog, which shows it in its error
// slot; the ones behind a plain button show the server's error as a toast.
import { toast } from '@/components/ui';
import { money } from '@/lib/format';
import { useApiMutation } from '@/lib/query';
import {
  acceptOrder,
  addOrderNote,
  changeOrderSupplier,
  decideVerification,
  dispatchOrder,
  fetchOrderResult,
  refundOrder,
  reopenOrder,
  replyOrder,
} from '../api';
import { orderLabel } from '../lib/status';
import type {
  Order,
  OrderNoteBody,
  RefundOrderBody,
  ReopenOrderBody,
  ReplyOrderBody,
  SupplierOption,
  VerificationBody,
} from '../types';
import { ORDER_STALE_KEYS, staleOrders } from './keys';
import { useOrderGrants } from './useOrderGrants';
import { useRefreshOrders } from './useRefreshOrders';

const NO_ERROR_TOAST = () => false as const;

/** An order with the body to send for it. */
type WithBody<B> = { order: Order; body: B };

/** Accepts a manual order: it moves to Processing and the operator works on it by hand. */
export function useAcceptOrder() {
  return useApiMutation({
    mutationFn: (order: Order) => acceptOrder(order.id),
    invalidates: (_result, order) => staleOrders(order.id),
    invalidateKeys: ORDER_STALE_KEYS,
    successNotification: (_result, order) => ({
      message: `${orderLabel(order)} accepted`,
      description: 'Now Processing. Complete it with the reply when the work is done.',
    }),
  });
}

/**
 * Completes one order with its reply. `onViewLedger` adds the demo's "View ledger" button to the toast (only for a
 * staff member who may read the ledger); `quiet` leaves a failure to the dialog that sent it.
 */
export function useReplyOrder(options: { onViewLedger?: (order: Order) => void; quiet?: boolean } = {}) {
  const grants = useOrderGrants();
  const { onViewLedger, quiet = false } = options;
  return useApiMutation({
    mutationFn: ({ order, body }: WithBody<ReplyOrderBody>) => replyOrder(order.id, body),
    invalidates: (_result, { order }) => staleOrders(order.id),
    invalidateKeys: ORDER_STALE_KEYS,
    onSuccess: (_result, { order }) => {
      toast({
        kind: 'success',
        title: `${orderLabel(order)} completed`,
        body: `${money(order.totalPrice)} settled to revenue.`,
        action:
          onViewLedger && grants.can('ledger:read')
            ? { label: 'View ledger', run: () => onViewLedger(order) }
            : undefined,
      });
    },
    ...(quiet ? { errorNotification: NO_ERROR_TOAST } : {}),
  });
}

/** Moves a completed order back to Processing. The dialog shows a refusal. */
export function useReopenOrder() {
  return useApiMutation({
    mutationFn: ({ order, body }: WithBody<ReopenOrderBody>) => reopenOrder(order.id, body),
    invalidates: (_result, { order }) => staleOrders(order.id),
    invalidateKeys: ORDER_STALE_KEYS,
    successNotification: (_result, { order }) => ({
      message: `${orderLabel(order)} reopened`,
      description: 'Back to Processing.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Refunds a completed merchant order. The toast can open the ledger entries. */
export function useRefundOrder(options: { onViewLedger?: (order: Order) => void } = {}) {
  const grants = useOrderGrants();
  return useApiMutation({
    mutationFn: ({ order, body }: WithBody<RefundOrderBody>) => refundOrder(order.id, body),
    invalidates: (_result, { order }) => staleOrders(order.id),
    invalidateKeys: ORDER_STALE_KEYS,
    onSuccess: (_result, { order }) => {
      toast({
        kind: 'success',
        title: `${money(order.totalPrice)} refunded`,
        body: `${orderLabel(order)}: the sale is reversed in the ledger.`,
        ttl: 5000,
        action:
          options.onViewLedger && grants.can('ledger:read')
            ? { label: 'Show entries', run: () => options.onViewLedger?.(order) }
            : undefined,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Answers a verification request. The dialog shows a refusal. */
export function useDecideVerification() {
  return useApiMutation({
    mutationFn: ({ order, body }: WithBody<VerificationBody>) => decideVerification(order.id, body),
    invalidates: (_result, { order }) => staleOrders(order.id),
    invalidateKeys: ORDER_STALE_KEYS,
    successNotification: (_result, { order, body }) =>
      body.decision === 'accept'
        ? { message: `${orderLabel(order)}: result accepted`, description: 'The charge stands.' }
        : { message: `${orderLabel(order)} refunded`, description: 'The money goes back to the buyer.' },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Adds an internal note to the timeline. The note form shows a refusal. */
export function useAddOrderNote() {
  return useApiMutation({
    mutationFn: ({ order, body }: WithBody<OrderNoteBody>) => addOrderNote(order.id, body),
    invalidates: (_result, { order }) => staleOrders(order.id),
    invalidateKeys: ORDER_STALE_KEYS,
    successNotification: () => ({ message: 'Note added', description: 'Only your team sees it.' }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Sends the order to its supplier again: the demo's Retry. */
export function useDispatchOrder() {
  return useApiMutation({
    mutationFn: (order: Order) => dispatchOrder(order.id),
    invalidates: (_result, order) => staleOrders(order.id),
    invalidateKeys: ORDER_STALE_KEYS,
    successNotification: (_result, order) => ({
      message: `${orderLabel(order)} re-sent`,
      description: 'Status is now Processing.',
    }),
  });
}

/** Asks the supplier for the result now. */
export function useFetchOrderResult() {
  return useApiMutation({
    mutationFn: (order: Order) => fetchOrderResult(order.id),
    invalidates: (_result, order) => staleOrders(order.id),
    invalidateKeys: ORDER_STALE_KEYS,
    successNotification: (_result, order) => ({
      message: `Asked ${order.supplier?.name ?? 'the supplier'} for the result`,
      description: 'If it is ready, the order completes now.',
    }),
  });
}

/**
 * The demo's Reroute: change the supplier, forget the old reference, then send the order to the new supplier
 * (MISMATCHES M26). If sending fails the supplier has still changed, so the lists are refreshed either way.
 */
export function useRerouteOrder() {
  const refresh = useRefreshOrders();
  return useApiMutation({
    mutationFn: async ({ order, supplier }: { order: Order; supplier: SupplierOption }) => {
      await changeOrderSupplier(order.id, { supplierId: supplier.id, resetReference: true });
      await dispatchOrder(order.id);
    },
    invalidates: (_result, { order }) => staleOrders(order.id),
    invalidateKeys: ORDER_STALE_KEYS,
    successNotification: (_result, { order, supplier }) => ({
      message: `${orderLabel(order)} rerouted to ${supplier.name}`,
      description: 'Status is now Processing.',
    }),
    onError: (_error, { order }) => void refresh([order.id]),
  });
}
