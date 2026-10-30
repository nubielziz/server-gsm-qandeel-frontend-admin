// The three refund decisions, each with the toast the demo showed and the reads it makes stale. Ports the toasts of rf-approve,
// rf-decline and rf-retry in 53-p-refunds.js. Approve and decline run inside a dialog, which shows a refusal in its own error
// slot; Retry sits behind a plain button, so the server's error shows as a toast.
import { toast } from '@/components/ui';
import { lm, money } from '@/lib/format';
import { useApiMutation } from '@/lib/query';
import { approveRefund, declineRefund, retryRefund } from '../api';
import { isPositive } from '../lib/amount';
import { refundLabel } from '../lib/labels';
import type { ApproveRefundBody, DeclineRefundBody, Refund } from '../types';
import { STALE_KEYS, staleRefund } from './keys';

const NO_ERROR_TOAST = () => false as const;

/**
 * Approves a refund in full or in part. The success toast says what went back and, when the server states it, how much of
 * it was VAT; `onShowEntries` adds the demo's "Show entries" button (the caller passes it only for staff who may read the ledger).
 */
export function useApproveRefund(options: { onShowEntries?: (orderId: number) => void } = {}) {
  const { onShowEntries } = options;
  return useApiMutation({
    mutationFn: ({ refund, body }: { refund: Refund; body: ApproveRefundBody }) =>
      approveRefund(refund.id, body),
    invalidates: (_result, { refund }) => staleRefund(refund),
    invalidateKeys: STALE_KEYS,
    onSuccess: (result, { refund, body }) => {
      // The server's answer wins; without one, the amount that was sent, else the amount on the request.
      const sent = result?.amount ?? body.amount ?? refund.amount;
      const vat = result?.taxAmount;
      toast({
        kind: 'success',
        title: `${refundLabel(refund.id)} refunded`,
        body: `${money(sent)} returned${vat && isPositive(vat) ? `, ${money(vat)} of it VAT` : ''}. Revenue and VAT were reversed in the ledger.`,
        action: onShowEntries
          ? { label: 'Show entries', run: () => onShowEntries(refund.orderId) }
          : undefined,
        ttl: 5000,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Declines a refund with the message the customer gets. */
export function useDeclineRefund() {
  return useApiMutation({
    mutationFn: ({ refund, body }: { refund: Refund; body: DeclineRefundBody }) =>
      declineRefund(refund.id, body),
    invalidates: (_result, { refund }) => staleRefund(refund),
    invalidateKeys: STALE_KEYS,
    onSuccess: (_result, { refund }) => {
      toast({
        kind: 'info',
        title: `${refundLabel(refund.id)} declined`,
        body: 'The customer has the reason by email.',
        ttl: 2800,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Sends a refund that failed at the gateway again. */
export function useRetryRefund() {
  return useApiMutation({
    mutationFn: (refund: Refund) => retryRefund(refund.id),
    invalidates: (_result, refund) => staleRefund(refund),
    invalidateKeys: STALE_KEYS,
    onSuccess: (result, refund) => {
      toast({
        kind: 'success',
        title: `${refundLabel(refund.id)} refunded`,
        body: `${lm(result?.amount ?? refund.amount, refund.currency, refund.fx)} went back to the customer.`,
        ttl: 3000,
      });
    },
  });
}
