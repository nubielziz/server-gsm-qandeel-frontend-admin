// CurrencyDialog: "Add currency" and "<CODE> rate and markup" (`POST` and `PATCH /admin/currencies`). Ports `st-fx-edit` of 55-p-settings.js
// (the demo's dialog edited the markup only; the map also lets staff set the rate by hand). Only what changed is sent on an edit.
import { useForm } from 'react-hook-form';
import { CheckboxField, dialogSubmit, FormDialog, TextField, toast } from '@/components/ui';
import { useCreateCurrency, useUpdateCurrency } from '../hooks/useCurrencies';
import { markupProblem, rateProblem } from '../lib/currencies';
import { sameDecimal, trimDecimal } from '../lib/decimal';
import type { Currency, UpdateCurrencyBody } from '../types';

type Values = {
  code: string;
  name: string;
  rateToBase: string;
  markupPercent: string;
  decimals: string;
  charmRounding: boolean;
  isStorefront: boolean;
};

/** Adds a currency, or edits the one it is given. */
export function CurrencyDialog({ currency, onClose }: { currency?: Currency; onClose: () => void }) {
  const create = useCreateCurrency();
  const update = useUpdateCurrency();
  const form = useForm<Values>({
    defaultValues: {
      code: currency?.code ?? '',
      name: currency?.name ?? '',
      rateToBase: currency ? trimDecimal(currency.rateToBase) : '',
      markupPercent: currency ? trimDecimal(currency.markupPercent) : '1.5',
      decimals: String(currency?.decimals ?? 2),
      charmRounding: currency?.charmRounding ?? true,
      isStorefront: currency?.isStorefront ?? false,
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      if (!currency) {
        await create.mutateAsync({
          code: values.code.trim().toUpperCase(),
          name: values.name.trim(),
          rateToBase: values.rateToBase.trim(),
          markupPercent: values.markupPercent.trim(),
          charmRounding: values.charmRounding,
          isStorefront: values.isStorefront,
          decimals: Number(values.decimals),
        });
        return;
      }
      const body: UpdateCurrencyBody = {};
      if (!sameDecimal(values.rateToBase, currency.rateToBase)) body.rateToBase = values.rateToBase.trim();
      if (!sameDecimal(values.markupPercent, currency.markupPercent))
        body.markupPercent = values.markupPercent.trim();
      if (values.charmRounding !== currency.charmRounding) body.charmRounding = values.charmRounding;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ currency, body });
    },
    { fields: ['code', 'name', 'rateToBase', 'markupPercent', 'decimals', 'charmRounding', 'isStorefront'] },
  );

  return (
    <FormDialog
      open
      title={currency ? `${currency.code} rate and markup` : 'Add currency'}
      sub="The markup is added on top of the market rate to cover exchange fees and small moves."
      confirm={currency ? 'Save' : 'Add currency'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        {!currency && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Code"
              autoComplete="off"
              maxLength={3}
              hint="Three letters, such as CHF."
              autoFocus
              error={errors.code}
              {...register('code', {
                validate: (v) => /^[A-Za-z]{3}$/.test(v.trim()) || 'Enter the three-letter code.',
              })}
            />
            <TextField
              label="Name"
              autoComplete="off"
              error={errors.name}
              {...register('name', { validate: (v) => v.trim() !== '' || 'Enter a name.' })}
            />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Rate (per $1)"
            className="mono"
            inputMode="decimal"
            autoComplete="off"
            autoFocus={currency !== undefined}
            hint="Refresh rates fetches it; type one only to correct it."
            error={errors.rateToBase}
            {...register('rateToBase', { validate: (v) => rateProblem(v) ?? true })}
          />
          <TextField
            label="Markup (%)"
            className="mono"
            inputMode="decimal"
            autoComplete="off"
            hint="Typical: 1 to 3. Above 5 customers will notice."
            error={errors.markupPercent}
            {...register('markupPercent', { validate: (v) => markupProblem(v) ?? true })}
          />
        </div>
        {!currency && (
          <TextField
            label="Decimals"
            inputMode="numeric"
            autoComplete="off"
            hint="How many decimals prices show."
            error={errors.decimals}
            {...register('decimals', { validate: (v) => /^[0-4]$/.test(v.trim()) || 'Enter 0 to 4.' })}
          />
        )}
        <CheckboxField
          label="Round prices to a clean ending"
          error={errors.charmRounding}
          {...register('charmRounding')}
        />
        {!currency && (
          <CheckboxField
            label="Offer prices in this currency"
            error={errors.isStorefront}
            {...register('isStorefront')}
          />
        )}
      </div>
    </FormDialog>
  );
}
