// IssueInvoiceDialog: "Issue manual invoice": pick a merchant, type an amount and what it is for. New in the console
// (MISMATCHES M123). The server checks the amount, adds tax and numbers the invoice; its message shows under the field it names, or
// in the dialog's error slot. The merchant names come from a private lookup (needs `clients:read`).
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextareaField, TextField, dialogSubmit } from '@/components/ui';
import { useCreateInvoice } from '../hooks/useCreateInvoice';
import { useMerchantOptions } from '../hooks/useMerchantOptions';
import { isPositiveMoney, normalizeAmount } from '../lib/invoices';

type Values = { clientId: string; amount: string; description: string };

export function IssueInvoiceDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateInvoice();
  const merchants = useMerchantOptions();
  const form = useForm<Values>({ defaultValues: { clientId: '', amount: '', description: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const options = [
    { value: '', label: merchants.isLoading ? 'Loading merchants…' : 'Choose a merchant' },
    ...(merchants.data ?? []).map((merchant) => ({ value: merchant.id, label: merchant.name })),
  ];

  const submit = dialogSubmit(
    form,
    async (values) => {
      const amount = normalizeAmount(values.amount);
      // The form already checked the amount; this keeps the types honest.
      if (!amount) return false;
      await create.mutateAsync({
        clientId: Number(values.clientId),
        amount,
        description: values.description.trim(),
      });
    },
    { fields: ['clientId', 'amount', 'description'] },
  );

  return (
    <FormDialog
      open
      title="Issue manual invoice"
      sub="Bills a merchant for an amount outside the wallet top-up flow."
      confirm="Issue invoice"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <SelectField
          label="Merchant"
          selectWrapClassName="w-full"
          options={options}
          disabled={merchants.isLoading}
          error={
            errors.clientId ?? (merchants.isError ? { message: 'Could not load the merchants.' } : undefined)
          }
          {...register('clientId', { required: 'Choose the merchant to bill.' })}
        />
        <TextField
          label="Amount (USD)"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          hint="The server adds any tax that applies."
          error={errors.amount}
          {...register('amount', {
            validate: (value) => {
              const amount = normalizeAmount(value);
              if (!amount) return 'Enter an amount, for example 125.50.';
              return isPositiveMoney(amount) || 'Enter an amount greater than zero.';
            },
          })}
        />
        <TextareaField
          label="What it is for"
          maxLength={200}
          placeholder="Shown on the invoice"
          error={errors.description}
          {...register('description', {
            validate: (value) => value.trim() !== '' || 'Say what the invoice is for.',
          })}
        />
      </div>
    </FormDialog>
  );
}
