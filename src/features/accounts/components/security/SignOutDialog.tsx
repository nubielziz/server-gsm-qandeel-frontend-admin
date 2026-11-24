// SignOutDialog: "Sign <name> out everywhere?" (action `signout`), for one account or the ticked accounts of the list. One account: a review
// step that says how many devices are signed in, then one request. Many: one request per account in order with a progress line, then a
// toast when every one went through, or a summary of the ones the server refused. Nobody is emailed.
import { useRef, useState } from 'react';
import { BulkSummaryDialog, ConfirmDialog, toast, type BulkSummary } from '@/components/ui';
import { summarizeOutcome } from '@/lib/bulk';
import { accountLabel } from '@/lib/format';
import { useRevokeAccountSessions } from '../../hooks/useSecurityMutations';
import type { AccountRow } from '../../types';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountDialogProps, ManyAccountsDialogProps } from '../types';
import { devicesText, signedInText } from './securityText';
import { useSignOutAccounts } from './useSignOutAccounts';

const UNIT = { one: 'account', many: 'accounts' };

function SignOutOne({ account, onClose }: AccountDialogProps) {
  const signOut = useRevokeAccountSessions();
  return (
    <ConfirmDialog
      open
      title={dialogTitle('signout', [account])}
      body={
        <>
          <p>{signedInText(account.security?.activeSessions ?? 0)}</p>
          <p className="mt-2">A sign-in step in progress ends too. They are not emailed.</p>
        </>
      }
      confirm="Sign out"
      onClose={onClose}
      onConfirm={() => signOut.mutateAsync(account).then(() => undefined)}
    />
  );
}

function SignOutMany({ accounts, onClose }: { accounts: readonly AccountRow[]; onClose: () => void }) {
  const { signOut, line } = useSignOutAccounts();
  // What the server refused, kept until the confirm step has closed, then shown on its own.
  const refused = useRef<BulkSummary | null>(null);
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  const devices = accounts.reduce((total, account) => total + (account.security?.activeSessions ?? 0), 0);

  if (summary) return <BulkSummaryDialog summary={summary} unit={UNIT} onClose={onClose} />;
  return (
    <ConfirmDialog
      open
      title={dialogTitle('signout', accounts)}
      body={
        <>
          <p>
            {devicesText(devices)} {devices === 1 ? 'is' : 'are'} signed in under these {accounts.length}{' '}
            accounts. They must sign in again.
          </p>
          <p className="mt-2">They are not emailed.</p>
          {line && (
            <p className="mt-2 font-medium text-ink" role="status">
              {line}
            </p>
          )}
        </>
      }
      confirm="Sign out"
      onClose={() => (refused.current ? setSummary(refused.current) : onClose())}
      onConfirm={async () => {
        const outcome = await signOut(accounts);
        if (outcome.failed.length > 0) {
          refused.current = summarizeOutcome('signed out', accounts, outcome, {
            keyOf: (account) => account.id,
            labelOf: accountLabel,
          });
        } else {
          toast({ title: `${accounts.length} accounts signed out of every device` });
        }
      }}
    />
  );
}

/**
 * The sign-out dialog. It is mounted only while open.
 *
 * Why: ends every session of an account at once (a lost phone, a leaked password); the person is not mailed. Offered with
 * `clients:security` to an account with a login and an open session (`actionOffer('signout', …)`, `bulkOffer`).
 * Side effects: `POST /admin/clients/:id/sessions/revoke` for each account; the records are read again; a toast.
 */
export function SignOutDialog({ accounts, onClose }: ManyAccountsDialogProps) {
  const [only] = accounts;
  if (accounts.length === 1 && only) return <SignOutOne account={only} onClose={onClose} />;
  return <SignOutMany accounts={accounts} onClose={onClose} />;
}
