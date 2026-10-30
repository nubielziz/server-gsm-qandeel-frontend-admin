// PasswordDialog: "Password for <name>" (the demo's `cu-pw` action): email a link to choose a password, or have the server make a
// temporary one, optionally signing the customer out everywhere. The old password is never shown.
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { CheckboxField, FormDialog, RadioGroup, dialogSubmit } from '@/components/ui';
import { useSetCustomerPassword } from '../hooks/useCustomerMutations';
import type { CustomerDetail, PasswordMode } from '../types';
import { PASSWORD_MODES } from './passwordModes';

type Values = { mode: PasswordMode; revokeSessions: boolean };

export interface PasswordDialogProps {
  customer: CustomerDetail;
  onClose: () => void;
  /** Called after the dialog closed when the server made a temporary password, so it can be shown once. */
  onReveal: (name: string, password: string) => void;
}

/**
 * Replaces a customer's password. A temporary password comes back once and is passed on to the one-time dialog after this
 * one closes.
 */
export function PasswordDialog({ customer, onClose, onReveal }: PasswordDialogProps) {
  const setPassword = useSetCustomerPassword();
  const revealed = useRef<string | undefined>(undefined);
  const form = useForm<Values>({ defaultValues: { mode: 'reset_link', revokeSessions: true } });
  const { register } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const result = await setPassword.mutateAsync({ customer, body: values });
      revealed.current = result?.temporaryPassword;
    },
    { fields: ['mode', 'revokeSessions'] },
  );

  return (
    <FormDialog
      open
      title={`Password for ${customer.name}`}
      sub="You can replace it but never read it."
      confirm="Continue"
      onClose={() => (revealed.current ? onReveal(customer.name, revealed.current) : onClose())}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <RadioGroup legend="Password" options={PASSWORD_MODES} {...register('mode')} />
        <CheckboxField label="Sign them out of every device" {...register('revokeSessions')} />
      </div>
    </FormDialog>
  );
}
