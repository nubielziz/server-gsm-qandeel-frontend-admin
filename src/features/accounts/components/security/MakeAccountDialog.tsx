// MakeAccountDialog: "Make an account for <name>" (action `make-account`): turns a guest, a record a checkout made, into an account with a
// login on the retail rank; their orders stay on it. They get a link to choose a password, or a temporary password shown once after this
// form has closed. Another login account on the same email is the one refusal this dialog explains with a way to find it.
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { FormDialog, dialogSubmit } from '@/components/ui';
import { RevealPasswordDialog } from '@/features/access';
import { isApiError } from '@/lib/api';
import { accountLabel } from '@/lib/format';
import { useMakeAccount } from '../../hooks/useAccountMutations';
import { accountsListPath } from '../../lib/paths';
import type { PasswordMode } from '../../types';
import { useAccountGrants } from '../frame/useAccountGrants';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountDialogProps } from '../types';
import { PasswordHowRow } from './PasswordHowRow';

type Values = { mode: PasswordMode };

interface FormProps extends AccountDialogProps {
  /** Called after the form closed when the server made a temporary password, so it can be shown once. */
  onReveal: (password: string) => void;
}

// The form. Its mutation (and so the answer, which may hold the temporary password) goes away as soon as this component does.
function MakeAccountForm({ account, onClose, onReveal }: FormProps) {
  const grants = useAccountGrants();
  const make = useMakeAccount();
  const revealed = useRef<string | undefined>(undefined);
  const [conflict, setConflict] = useState(false);
  const form = useForm<Values>({ defaultValues: { mode: 'reset_link' } });

  const submit = dialogSubmit(
    form,
    async (values) => {
      setConflict(false);
      try {
        const result = await make.mutateAsync({ account, body: { mode: values.mode } });
        revealed.current = result.temporaryPassword;
      } catch (error) {
        // Another account with a login already uses this email: say so, with the way to that account (the guest stays a guest).
        if (isApiError(error) && error.fieldCodes.email?.includes('login_exists')) {
          setConflict(true);
          return false;
        }
        throw error;
      }
    },
    { fields: ['mode'] },
  );

  return (
    <FormDialog
      open
      title={dialogTitle('make-account', [account])}
      sub="Turns this guest into an account with a login, on the retail rank. Their orders stay on it."
      confirm="Make account"
      onClose={() => (revealed.current ? onReveal(revealed.current) : onClose())}
      onSubmit={submit}
    >
      <Controller
        control={form.control}
        name="mode"
        render={({ field }) => (
          <PasswordHowRow
            id="make-account-how"
            value={field.value}
            onChange={field.onChange}
            lock={grants.needs('clients:security')}
          />
        )}
      />
      {conflict && (
        <p className="mt-3 text-sm text-crit-fg" role="status">
          Another account with a login uses this email.{' '}
          <Link className="link" to={accountsListPath({ q: account.email })}>
            Find it
          </Link>
        </p>
      )}
    </FormDialog>
  );
}

/**
 * The make-an-account dialog of one guest. It is mounted only while open.
 *
 * Why: a guest has no login (a checkout made the record); staff give them one on request (the "Make an account" action of the guest's
 * record and of the list). Offered with `clients:update`, and `clients:security` for a temporary password, to a guest that is not
 * anonymized (`actionOffer('make-account', …)`).
 * Side effects: `POST /admin/clients/:id/account {mode}`; the account's record and the lists are read again; a toast. A 409
 * `ACCOUNT_EXISTS` shows in the dialog.
 */
export function MakeAccountDialog({ account, onClose }: AccountDialogProps) {
  const [shown, setShown] = useState<string | null>(null);
  if (shown) {
    return <RevealPasswordDialog name={accountLabel(account)} password={shown} onClose={onClose} />;
  }
  return <MakeAccountForm account={account} onClose={onClose} onReveal={setShown} />;
}
