// IssueInvoiceFields: the rows of the Issue invoice view, label on the left and control on the right: Merchant, Amount (USD) and What it is
// for. It owns no request: the save belongs to the view. The merchant names come from the accounts list, merchant ranks only.
import type { UseFormReturn } from 'react-hook-form';
import { SelectField, TextareaField, TextField } from '@/components/ui';
import type { useMerchantOptions } from '../../hooks/useMerchantOptions';
import type { IssueInvoiceValues } from '../../hooks/useIssueInvoiceForm';
import { isPositiveMoney, normalizeAmount } from '../../lib/invoices';

export interface IssueInvoiceFieldsProps {
  form: UseFormReturn<IssueInvoiceValues>;
  /** The merchant-rank accounts the menu offers. */
  merchants: ReturnType<typeof useMerchantOptions>;
}

/** The rows, with the checks that run before the server is called (the server checks them again). */
export function IssueInvoiceFields({ form, merchants }: IssueInvoiceFieldsProps) {
  const {
    register,
    formState: { errors },
  } = form;
  const options = [
    { value: '', label: merchants.isLoading ? 'Loading merchants…' : 'Choose a merchant' },
    ...(merchants.data ?? []).map((merchant) => ({ value: merchant.id, label: merchant.name })),
  ];
  return (
    <>
      <SelectField
        layout="row"
        label="Merchant"
        required
        selectWrapClassName="w-full max-w-md"
        options={options}
        disabled={merchants.isLoading}
        error={
          errors.clientId ?? (merchants.isError ? { message: 'Could not load the merchants.' } : undefined)
        }
        {...register('clientId', { required: 'Choose the merchant to bill.' })}
      />
      <TextField
        layout="row"
        label="Amount (USD)"
        required
        className="w-40"
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
        layout="row"
        label="What it is for"
        required
        maxLength={200}
        placeholder="Shown on the invoice"
        error={errors.description}
        {...register('description', {
          validate: (value) => value.trim() !== '' || 'Say what the invoice is for.',
        })}
      />
    </>
  );
}
