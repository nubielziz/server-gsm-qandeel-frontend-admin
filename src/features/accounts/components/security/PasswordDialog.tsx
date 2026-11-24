// PasswordDialog: "Password of <name>" (action `password`): email a link to choose a password (the invitation again while there is none), or have
// the server make a temporary one, and sign the account out of every device (on by default). The old password is never shown. A temporary
// password comes back once: after the form has closed it is shown in the access feature's one-time dialog and kept nowhere else.
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { CheckboxField, FormDialog, dialogSubmit } from '@/components/ui';
import { RevealPasswordDialog } from '@/features/access';
import { accountLabel } from '@/lib/format';
import { useSetAccountPassword } from '../../hooks/useSecurityMutations';
import type { PasswordMode } from '../../types';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountDialogProps } from '../types';
import { PasswordHowRow } from './PasswordHowRow';

type Values = { mode: PasswordMode; revokeSessions: boolean };
const FIELDS = ['mode', 'revokeSessions'] as const;

interface FormProps extends AccountDialogProps {
  /** Called after the form closed when the server made a temporary password, so it can be shown once. */
  onReveal: (password: string) => void;
}

// The form. Its mutation (and so the answer, which may hold the temporary password) goes away as soon as this component does.
function PasswordForm({ account, onClose, onReveal }: FormProps) {
  const setPassword = useSetAccountPassword();
  const revealed = useRef<string | undefined>(undefined);
  const form = useForm<Values>({ defaultValues: { mode: 'reset_link', revokeSessions: true } });

  const submit = dialogSubmit(
    form,
    async (values) => {
      const result = await setPassword.mutateAsync({ account, body: values });
      revealed.current = result.temporaryPassword;
    },
    { fields: FIELDS },
  );

  return (
    <FormDialog
      open
      title={dialogTitle('password', [account])}
      sub="You can replace it but never read it."
      confirm="Continue"
      onClose={() => (revealed.current ? onReveal(revealed.current) : onClose())}
      onSubmit={submit}
    >
      <Controller
        control={form.control}
        name="mode"
        render={({ field }) => (
          <PasswordHowRow
            id="password-how"
            value={field.value}
            onChange={field.onChange}
            hasPassword={account.security?.hasPassword !== false}
          />
        )}
      />
      <CheckboxField layout="row" label="Sign out of every device" {...form.register('revokeSessions')} />
    </FormDialog>
  );
}

/**
 * The password dialog of one account. It is mounted only while open, so every opening starts with the defaults.
 *
 * Why: staff replace a password and never read one (the map's password routes). Offered with `clients:security` to an active account
 * with a login (the rules of `actionOffer('password', …)`); the server also answers `NOT_ACTIVE` (409) and `RATE_LIMITED` (429), which
 * show in the dialog, which stays open.
 * Side effects: `POST /admin/clients/:id/password {mode, revokeSessions}`; the account's record is read again; a toast.
 */
export function PasswordDialog({ account, onClose }: AccountDialogProps) {
  const [shown, setShown] = useState<string | null>(null);
  if (shown) {
    return <RevealPasswordDialog name={accountLabel(account)} password={shown} onClose={onClose} />;
  }
  return <PasswordForm account={account} onClose={onClose} onReveal={setShown} />;
}
