// The two wallet writes whose success words the Accounts page sets itself: the adjustment ("New balance $X") and the official statement file
// ("Saved <file>"). The other wallet writes (hold, lift, credit limit) are the data layer's own hooks. Both sit on the data layer's API
// functions and keys: an adjustment makes the wallet, the statement, the record and the dashboard's negative wallets stale.
import { accountLabel, money } from '@/lib/format';
import { DASHBOARD_KEY, useApiMutation } from '@/lib/query';
import { adjustAccountWallet, downloadAccountStatement } from '../../api';
import { STATEMENT_KEY, staleAccount, WALLET_KEY } from '../../hooks/keys';
import { useRefreshOnKeyReuse } from '../../hooks/useKeyReuseRefresh';
import type { AccountRow, AdjustWalletBody } from '../../types';

/** The part of an account the toasts and requests need. */
type Who = Pick<AccountRow, 'id' | 'name' | 'email'>;

// What an adjustment makes stale, on success and when the server refuses a reused key (the first press was applied).
const ADJUST_KEYS = [WALLET_KEY, STATEMENT_KEY, DASHBOARD_KEY];

/**
 * Posts an adjustment with the dialog's Idempotency-Key (made once per opening, so a retry never posts twice). The dialog shows a failed
 * call itself, so no error toast. The success toast gives the new balance the server reports.
 *
 * @returns the mutation; call it with `{ account, body, key }`.
 * @throws the server's refusal (`APPROVAL_REQUIRED`, `CREDIT_LIMIT_EXCEEDED`, `INSUFFICIENT_FUNDS`, `NO_ACCOUNT`, `ANONYMIZED`) to the caller.
 * @see POST /admin/clients/:id/wallet/adjust
 */
export function useAdjustBalance() {
  const refreshOnReuse = useRefreshOnKeyReuse(ADJUST_KEYS);
  return useApiMutation({
    mutationFn: ({ account, body, key }: { account: Who; body: AdjustWalletBody; key: string }) =>
      adjustAccountWallet(account.id, body, key),
    invalidates: (_result, { account }) => staleAccount(account.id),
    invalidateKeys: ADJUST_KEYS,
    successNotification: (result, { account, body }) => ({
      // Without the wallet in the answer the toast only says the entry was posted.
      message: result?.wallet ? `New balance ${money(result.wallet.balance)}` : 'Adjustment posted',
      description: `${body.direction === 'credit' ? 'Added' : 'Took'} ${money(body.amount)} · ${accountLabel(account)}`,
    }),
    errorNotification: () => false as const,
    onError: (error, { account }) => refreshOnReuse(error, account),
  });
}

/**
 * Downloads the official statement of a merchant wallet; the file is named by the server. The success toast says which file was saved; a
 * refusal shows in the default error toast.
 *
 * @returns the mutation; call it with the account.
 * @see GET /admin/reports/client-statement/:clientId
 */
export function useStatementFile() {
  return useApiMutation({
    mutationFn: (account: Who) => downloadAccountStatement(account.id),
    successNotification: (name) => ({ message: `Saved ${name}` }),
  });
}
