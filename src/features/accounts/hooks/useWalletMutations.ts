// The wallet actions on an account: hold and lift, and the credit limit (the adjustment and the official statement download are the wallet
// area's own hooks, components/wallet/useWalletWrites). Each write takes the dialog's Idempotency-Key, made once per dialog opening
// (`useDialogKey`), so a retry of the same opening can never act twice.
// The dialogs show a failed call themselves (under the field the server named, or in the error slot), so none of these toasts an error.
import { accountLabel, money } from '@/lib/format';
import { DASHBOARD_KEY, useApiMutation } from '@/lib/query';
import { freezeAccountWallet, setAccountCreditLimit, unfreezeAccountWallet } from '../api';
import type { AccountRow, WalletReasonBody } from '../types';
import { STATEMENT_KEY, staleAccount, WALLET_KEY } from './keys';
import { useRefreshOnKeyReuse } from './useKeyReuseRefresh';

/** The part of an account the toasts and requests need. */
type Who = Pick<AccountRow, 'id' | 'name' | 'email'>;

// A wallet action moves the figures and the statement, and the dashboard lists negative wallets, so it is refreshed too. The same reads are
// refreshed when the server refuses a reused key: the first press of that opening was applied.
const WALLET_KEYS = [WALLET_KEY, STATEMENT_KEY, DASHBOARD_KEY];

const NO_ERROR_TOAST = () => false as const;

/** Puts the live wallet on hold with a reason. */
export function useFreezeWallet() {
  const refreshOnReuse = useRefreshOnKeyReuse(WALLET_KEYS);
  return useApiMutation({
    mutationFn: ({ account, body, key }: { account: Who; body: WalletReasonBody; key: string }) =>
      freezeAccountWallet(account.id, body, key),
    invalidates: (_wallet, { account }) => staleAccount(account.id),
    invalidateKeys: [...WALLET_KEYS],
    successNotification: (_wallet, { account }) => ({
      message: 'Wallet put on hold',
      description: `${accountLabel(account)} cannot spend from it until you lift the hold.`,
    }),
    errorNotification: NO_ERROR_TOAST,
    onError: (error, { account }) => refreshOnReuse(error, account),
  });
}

/** Lifts the hold on the live wallet. */
export function useUnfreezeWallet() {
  const refreshOnReuse = useRefreshOnKeyReuse(WALLET_KEYS);
  return useApiMutation({
    mutationFn: ({ account, body, key }: { account: Who; body: WalletReasonBody; key: string }) =>
      unfreezeAccountWallet(account.id, body, key),
    invalidates: (_wallet, { account }) => staleAccount(account.id),
    invalidateKeys: [...WALLET_KEYS],
    successNotification: (_wallet, { account }) => ({
      message: 'Hold lifted',
      description: `${accountLabel(account)} can spend from the wallet again.`,
    }),
    errorNotification: NO_ERROR_TOAST,
    onError: (error, { account }) => refreshOnReuse(error, account),
  });
}

/** Changes how far below zero a merchant wallet may go. The dialog's key is sent with every retry of that opening. */
export function useSetCreditLimit() {
  const refreshOnReuse = useRefreshOnKeyReuse(WALLET_KEYS);
  return useApiMutation({
    mutationFn: ({ account, creditLimit, key }: { account: Who; creditLimit: string; key: string }) =>
      setAccountCreditLimit(account.id, { creditLimit }, key),
    invalidates: (_wallet, { account }) => staleAccount(account.id),
    invalidateKeys: [...WALLET_KEYS],
    successNotification: (_wallet, { account, creditLimit }) => ({
      message: 'Credit limit updated',
      description: `${accountLabel(account)} can now go ${money(creditLimit)} below zero.`,
    }),
    errorNotification: NO_ERROR_TOAST,
    onError: (error, { account }) => refreshOnReuse(error, account),
  });
}
