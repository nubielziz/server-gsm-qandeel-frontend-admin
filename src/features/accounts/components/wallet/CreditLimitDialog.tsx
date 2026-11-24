// CreditLimitDialog: "Credit limit of <name>": how far below zero a merchant wallet may go (`PATCH /admin/clients/:id/credit-limit`). Zero removes
// the credit. The box starts from the current limit. The server decides whether the new limit is allowed (the rank allows no credit, a non-Owner
// ceiling) and its words show in the dialog. The Idempotency-Key is made once when the dialog opens and sent with every retry of that opening.
import { useForm } from 'react-hook-form';
import { FormDialog, TextField, dialogSubmit } from '@/components/ui';
import { useDialogKey } from '../../hooks/useDialogKey';
import { useSetCreditLimit } from '../../hooks/useWalletMutations';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountDialogProps } from '../types';
import { amountInput, parseAmount } from './amount';

const LIMIT_WORDS = 'Enter an amount like 500.00, or 0 for no credit.';

/**
 * Saves a new credit limit; the figures of the wallet follow it. Needs `wallet:credit_limit` (the part and the menus do not offer it otherwise).
 *
 * @param props.account the account; its row carries the current limit when the staff member may read wallets.
 * @param props.onClose asked for when the dialog is done or cancelled.
 * @throws nothing: a refusal stays in the dialog, which stays open.
 * @see PATCH /admin/clients/:id/credit-limit
 */
export function CreditLimitDialog({ account, onClose }: AccountDialogProps) {
  const setLimit = useSetCreditLimit();
  const key = useDialogKey();
  const form = useForm<{ creditLimit: string }>({
    defaultValues: { creditLimit: account.wallet ? amountInput(account.wallet.creditLimit) : '' },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async ({ creditLimit }) => {
      const parsed = parseAmount(creditLimit, { allowZero: true });
      if (!parsed) return LIMIT_WORDS;
      await setLimit.mutateAsync({ account, creditLimit: parsed, key });
    },
    { fields: ['creditLimit'] },
  );

  return (
    <FormDialog
      open
      title={dialogTitle('credit-limit', [account])}
      sub="How far below zero the wallet may go. Zero removes the credit."
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
          validate: (value) => parseAmount(value, { allowZero: true }) !== null || LIMIT_WORDS,
        })}
      />
    </FormDialog>
  );
}
