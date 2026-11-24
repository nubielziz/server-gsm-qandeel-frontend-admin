// The two decisions on a deposit, each with the toast the demo showed and the reads it makes stale. The review dialogs show
// a failed call themselves (in the error slot, or under the field the server named), so neither of these toasts an error.
import { useApiMutation } from '@/lib/query';
import { money } from '@/lib/format';
import { approvePayment, rejectPayment } from '../api';
import { paymentLabel, payerName } from '../lib/payments';
import type { Payment } from '../types';
import { APPROVE_STALE_KEYS, DEPOSIT_STALE_KEYS, staleDeposit } from './keys';

const NO_ERROR_TOAST = () => false as const;

/**
 * Approves a pending deposit: the server credits the account's live wallet and posts the entry. The toast names the amount and,
 * when the server's answer carries the wallet, what it holds now (the demo's "Wallet is now …", "Balance is now …" for a store balance).
 */
export function useApprovePayment() {
  return useApiMutation({
    mutationFn: (payment: Payment) => approvePayment(payment.id),
    invalidates: (_updated, payment) => staleDeposit(payment),
    invalidateKeys: APPROVE_STALE_KEYS,
    successNotification: (updated, payment) => {
      const named = payerName(updated.client || updated.customer ? updated : payment);
      const name = named === '–' ? 'the account' : named;
      const wallet = (updated.client ?? updated.customer)?.walletBalance;
      const what = updated.client || !updated.customer ? 'Wallet' : 'Balance';
      return {
        message: `${paymentLabel(payment.id)} approved`,
        description: `${money(updated.netAmount)} credited to ${name}.${wallet ? ` ${what} is now ${money(wallet)}.` : ''}`,
      };
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Rejects a pending deposit with a reason the account holder sees. No money moves. */
export function useRejectPayment() {
  return useApiMutation({
    mutationFn: ({ payment, reason }: { payment: Payment; reason: string }) =>
      rejectPayment(payment.id, { reason }),
    invalidates: (_updated, { payment }) => staleDeposit(payment),
    invalidateKeys: DEPOSIT_STALE_KEYS,
    successNotification: (_updated, { payment }) => ({
      message: `${paymentLabel(payment.id)} rejected`,
      description: `${payerName(payment) === '–' ? 'The account holder' : payerName(payment)} was told why. No money moved.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}
