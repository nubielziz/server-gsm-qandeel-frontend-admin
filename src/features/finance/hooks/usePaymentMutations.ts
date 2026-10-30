// The two decisions on a deposit, each with the toast the demo showed and the reads it makes stale. The review dialogs show
// a failed call themselves (in the error slot, or under the field the server named), so neither of these toasts an error.
import { useApiMutation } from '@/lib/query';
import { money } from '@/lib/format';
import { approvePayment, rejectPayment } from '../api';
import { paymentLabel } from '../lib/payments';
import type { Payment } from '../types';
import { APPROVE_STALE_KEYS, DEPOSIT_STALE_KEYS, staleDeposit } from './keys';

const NO_ERROR_TOAST = () => false as const;

/**
 * Approves a pending deposit: the server credits the wallet and posts the entry. The toast names the amount and, when the
 * server's answer carries the merchant's wallet, what the wallet holds now (the demo's "Wallet is now …").
 */
export function useApprovePayment() {
  return useApiMutation({
    mutationFn: (payment: Payment) => approvePayment(payment.id),
    invalidates: (_updated, payment) => staleDeposit(payment),
    invalidateKeys: APPROVE_STALE_KEYS,
    successNotification: (updated, payment) => {
      const name = updated.client?.name ?? payment.client?.name ?? 'the merchant';
      const wallet = updated.client?.walletBalance;
      return {
        message: `${paymentLabel(payment.id)} approved`,
        description: `${money(updated.netAmount)} credited to ${name}.${wallet ? ` Wallet is now ${money(wallet)}.` : ''}`,
      };
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Rejects a pending deposit with a reason the merchant sees. No money moves. */
export function useRejectPayment() {
  return useApiMutation({
    mutationFn: ({ payment, reason }: { payment: Payment; reason: string }) =>
      rejectPayment(payment.id, { reason }),
    invalidates: (_updated, { payment }) => staleDeposit(payment),
    invalidateKeys: DEPOSIT_STALE_KEYS,
    successNotification: (_updated, { payment }) => ({
      message: `${paymentLabel(payment.id)} rejected`,
      description: `${payment.client?.name ?? 'The merchant'} was told why. No money moved.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}
