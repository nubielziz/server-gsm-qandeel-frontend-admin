// CreateAccountDialog: "Create an account for <name>" (the demo's `cu-mkacct` action) for a customer who bought as a guest: how
// they get their first password. Their earlier orders are linked to the new account by the server.
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FormDialog, RadioGroup, dialogSubmit } from '@/components/ui';
import { useCreateCustomerAccount } from '../hooks/useCustomerMutations';
import type { CustomerDetail, PasswordMode } from '../types';
import { PASSWORD_MODES } from './passwordModes';

type Values = { mode: PasswordMode };

export interface CreateAccountDialogProps {
  customer: CustomerDetail;
  onClose: () => void;
  /** Called after the dialog closed when the server made a temporary password, so it can be shown once. */
  onReveal: (name: string, password: string) => void;
}

/** Creates the account. A temporary password comes back once and is passed on after this dialog closes. */
export function CreateAccountDialog({ customer, onClose, onReveal }: CreateAccountDialogProps) {
  const create = useCreateCustomerAccount();
  const revealed = useRef<string | undefined>(undefined);
  const form = useForm<Values>({ defaultValues: { mode: 'reset_link' } });
  const { register } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const result = await create.mutateAsync({ customer, mode: values.mode });
      revealed.current = result?.temporaryPassword;
    },
    { fields: ['mode'] },
  );

  return (
    <FormDialog
      open
      title={`Create an account for ${customer.name}`}
      sub="They bought as a guest. Their past orders will show in the new account."
      confirm="Create account"
      onClose={() => (revealed.current ? onReveal(customer.name, revealed.current) : onClose())}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <RadioGroup legend="Password" options={PASSWORD_MODES} {...register('mode')} />
      </div>
    </FormDialog>
  );
}
