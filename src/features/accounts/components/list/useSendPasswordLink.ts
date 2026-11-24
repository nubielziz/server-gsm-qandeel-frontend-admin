// The one-click "Send a password link" of the list's row menu: emails the account a link to choose a password (an invitation while it has
// none, a reset after one) without a dialog. The same offer as the Password dialog, with the toast of the list's words. A refusal (the
// account is not active, too many requests) shows as the default error toast.
import { useApiMutation } from '@/lib/query';
import { setAccountPassword } from '../../api';
import { staleAccount } from '../../hooks/keys';
import type { AccountRow } from '../../types';

/** `mutate(account)` sends the link. Side effects: `POST /admin/clients/:id/password {mode: 'reset_link', revokeSessions: false}`; the account's record is read again. */
export function useSendPasswordLink() {
  return useApiMutation({
    mutationFn: (account: Pick<AccountRow, 'id' | 'email'>) =>
      setAccountPassword(account.id, { mode: 'reset_link', revokeSessions: false }),
    gcTime: 0,
    invalidates: (_result, account) => staleAccount(account.id),
    successNotification: (_result, account) => ({
      message: `A link to set a password went to ${account.email}`,
    }),
  });
}
