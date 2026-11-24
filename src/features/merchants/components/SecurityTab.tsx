// SecurityTab: the "Security" tab of a merchant's page (feature 20): the sign-in facts, the staff tools (password, sign out, reset
// 2FA, resend verification). It keeps which dialog is open; a temporary password the server made is shown once in the access
// feature's dialog after the password dialog closes and is not kept in the query cache (`gcTime: 0`).
import { useState } from 'react';
import { RevealPasswordDialog } from '@/features/access';
import { useNow } from '@/lib/format';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import type { Client } from '../types';
import { MerchantConfirmDialog } from './MerchantConfirmDialog';
import { MerchantPasswordDialog } from './MerchantPasswordDialog';
import { SecurityActions } from './SecurityActions';
import { SecurityState } from './SecurityState';

type Dialog =
  { kind: 'password' | 'signout' | 'reset2fa' } | { kind: 'reveal'; name: string; password: string };

/** Composes the Security tab: the sign-in facts on the left, the staff tools on the right. */
export function SecurityTab({ client, grants }: { client: Client; grants: MerchantGrants }) {
  const now = useNow();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  return (
    <div className="p-3.5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-medium text-ink3">Sign-in</h3>
          <SecurityState client={client} now={now} />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium text-ink3">Manage sign-in</h3>
          <SecurityActions
            client={client}
            grants={grants}
            onPassword={() => setDialog({ kind: 'password' })}
            onSignOut={() => setDialog({ kind: 'signout' })}
            onReset2fa={() => setDialog({ kind: 'reset2fa' })}
          />
          <p className="mt-3 text-xs text-ink3">
            Passwords are stored as hashes. Nobody on your team can read a merchant’s password, only replace
            it. The merchant is emailed about a temporary password and a 2FA reset.
          </p>
        </div>
      </div>
      {dialog?.kind === 'password' && (
        <MerchantPasswordDialog
          client={client}
          onClose={close}
          onReveal={(name, password) => setDialog({ kind: 'reveal', name, password })}
        />
      )}
      {(dialog?.kind === 'signout' || dialog?.kind === 'reset2fa') && (
        <MerchantConfirmDialog kind={dialog.kind} client={client} onClose={close} />
      )}
      {dialog?.kind === 'reveal' && (
        <RevealPasswordDialog name={dialog.name} password={dialog.password} onClose={close} />
      )}
    </div>
  );
}
