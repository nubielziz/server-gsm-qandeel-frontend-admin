// The wallet actions on a customer: a manual adjustment, freeze and unfreeze. Each takes the dialog's Idempotency-Key, made once per
// dialog opening, so a retry of the same opening can never post twice. The dialogs show a failed call themselves (under the
// field the server named, or in the error slot), so none of these toasts an error.
import { customerLabel, money } from '@/lib/format';
import { DASHBOARD_KEY, useApiMutation } from '@/lib/query';
import { adjustCustomerWallet, freezeCustomerWallet, unfreezeCustomerWallet } from '../api';
import type { AdjustWalletBody, Customer, FreezeWalletBody } from '../types';
import { CUSTOMER_STATEMENT_KEY, CUSTOMER_WALLET_KEY } from './keys';

/** The part of a customer the toasts and requests need. */
type Who = Pick<Customer, 'id' | 'name' | 'email'>;

// An adjustment moves the figures and the statement; every wallet action changes what the dialog above it shows.
const WALLET_KEYS = [CUSTOMER_WALLET_KEY, CUSTOMER_STATEMENT_KEY, DASHBOARD_KEY];

/** Posts an adjustment. The toast says what moved and the balance the server reports afterwards. */
export function useAdjustCustomerWallet() {
  return useApiMutation({
    mutationFn: ({ customer, body, key }: { customer: Who; body: AdjustWalletBody; key: string }) =>
      adjustCustomerWallet(customer.id, body, key),
    invalidateKeys: [...WALLET_KEYS],
    successNotification: (result, { customer, body }) => ({
      message: `${body.direction === 'credit' ? 'Credited' : 'Debited'} ${money(body.amount)}`,
      description: `${customerLabel(customer)} balance is now ${money(result.wallet.balance)}.`,
    }),
    errorNotification: () => false as const,
  });
}

/** Puts the balance on hold with a reason. */
export function useFreezeCustomerWallet() {
  return useApiMutation({
    mutationFn: ({ customer, body, key }: { customer: Who; body: FreezeWalletBody; key: string }) =>
      freezeCustomerWallet(customer.id, body, key),
    invalidateKeys: [...WALLET_KEYS],
    successNotification: (_wallet, { customer }) => ({
      message: 'Balance put on hold',
      description: `${customerLabel(customer)} cannot pay from it until you lift the hold.`,
    }),
    errorNotification: () => false as const,
  });
}

/** Lifts the hold on the balance. */
export function useUnfreezeCustomerWallet() {
  return useApiMutation({
    mutationFn: ({ customer, body, key }: { customer: Who; body: FreezeWalletBody; key: string }) =>
      unfreezeCustomerWallet(customer.id, body, key),
    invalidateKeys: [...WALLET_KEYS],
    successNotification: (_wallet, { customer }) => ({
      message: 'Hold lifted',
      description: `${customerLabel(customer)} can pay from the balance again.`,
    }),
    errorNotification: () => false as const,
  });
}
