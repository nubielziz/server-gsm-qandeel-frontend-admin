// MerchantPasswordDialog: "Password for <merchant>": email a link to choose a password (the invitation again while they have none),
// or have the server make a temporary one, optionally signing the merchant out everywhere. The old password is never shown. A
// temporary password comes back once and is passed to the one-time dialog after this one closes.
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { CheckboxField, FormDialog, RadioGroup, dialogSubmit } from '@/components/ui';
import { useSetClientPassword } from '../hooks/useSecurityMutations';
import { passwordModes } from '../lib/passwordModes';
import type { Client, ClientPasswordMode } from '../types';

type Values = { mode: ClientPasswordMode; revokeSessions: boolean };

export interface MerchantPasswordDialogProps {
  client: Client;
  onClose: () => void;
  /** Called after the dialog closed when the server made a temporary password, so it can be shown once. */
  onReveal: (name: string, password: string) => void;
}

/** The merchant's password form. Mounted only while open. */
export function MerchantPasswordDialog({ client, onClose, onReveal }: MerchantPasswordDialogProps) {
  const setPassword = useSetClientPassword();
  const revealed = useRef<string | undefined>(undefined);
  const form = useForm<Values>({ defaultValues: { mode: 'reset_link', revokeSessions: true } });
  const { register } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const result = await setPassword.mutateAsync({ client, body: values });
      revealed.current = result.temporaryPassword;
    },
    { fields: ['mode', 'revokeSessions'] },
  );

  return (
    <FormDialog
      open
      title={`Password for ${client.name}`}
      sub="You can replace it but never read it."
      confirm="Continue"
      onClose={() => (revealed.current ? onReveal(client.name, revealed.current) : onClose())}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <RadioGroup
          legend="Password"
          options={passwordModes(client.security?.hasPassword !== false)}
          {...register('mode')}
        />
        <CheckboxField label="Sign them out of every device" {...register('revokeSessions')} />
      </div>
    </FormDialog>
  );
}
