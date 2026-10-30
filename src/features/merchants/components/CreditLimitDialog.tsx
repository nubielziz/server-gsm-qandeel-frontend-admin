// CreditLimitDialog: change how far below zero a merchant's wallet may go (`PATCH /admin/clients/:id/credit-limit`). The demo had
// no control for it (the limit was fixed seed data); the map adds the route. Zero removes the credit. The server decides whether
// the new limit is allowed and shows its message here when it is not.
import { useForm } from 'react-hook-form';
import { FormDialog, TextField, dialogSubmit } from '@/components/ui';
import { useSetCreditLimit } from '../hooks/useClientMutations';
import { amountInput, parseAmount } from '../lib/amount';
import type { Client, ClientWallet } from '../types';

export interface CreditLimitDialogProps {
  client: Pick<Client, 'id' | 'name'>;
  /** The current limit, to start from; missing while the balances load or when the staff member cannot read them. */
  wallet?: ClientWallet;
  onClose: () => void;
}

/** Saves a new credit limit; the server decides whether it is allowed and its message shows here. */
export function CreditLimitDialog({ client, wallet, onClose }: CreditLimitDialogProps) {
  const setLimit = useSetCreditLimit();
  const form = useForm<{ creditLimit: string }>({
    defaultValues: { creditLimit: wallet ? amountInput(wallet.creditLimit) : '' },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async ({ creditLimit }) => {
      const parsed = parseAmount(creditLimit, { allowZero: true });
      if (!parsed) return 'Enter an amount like 500.00, or 0 for no credit.';
      await setLimit.mutateAsync({ client, creditLimit: parsed });
    },
    { fields: ['creditLimit'] },
  );

  return (
    <FormDialog
      open
      title={`Credit limit for ${client.name}`}
      sub="How far below zero their wallet may go. Zero removes the credit."
      confirm="Save credit limit"
      onClose={onClose}
      onSubmit={submit}
    >
      <TextField
        label="Credit limit (USD)"
        inputMode="decimal"
        placeholder="0.00"
        autoComplete="off"
        error={errors.creditLimit}
        {...register('creditLimit', {
          validate: (value) =>
            parseAmount(value, { allowZero: true }) !== null ||
            'Enter an amount like 500.00, or 0 for no credit.',
        })}
      />
    </FormDialog>
  );
}
