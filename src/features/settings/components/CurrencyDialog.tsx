// CurrencyDialog: "Add currency" and "<CODE> rate and markup" (`POST` and `PATCH /admin/currencies`). Ports `st-fx-edit` of 55-p-settings.js
// (the demo's dialog edited the markup only; the map also lets staff set the rate by hand). Only what changed is sent on an edit.
// Adding picks the code from a menu; the name follows from the code and is sent as before. The decimals sit in the "More options" fold,
// filled from the code until the person types there: the browser says 3 for JOD, and the server answers 422 on `decimals` while a card
// method cannot charge three, so the box must be there to correct it. Editing keeps the name and the decimals in the same fold
// (decision 036). The rate stays visible: production runs with manual rates.
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  CheckboxField,
  dialogSubmit,
  FormDialog,
  MoreOptions,
  SelectField,
  TextField,
  toast,
} from '@/components/ui';
import { useCreateCurrency, useUpdateCurrency } from '../hooks/useCurrencies';
import {
  currencyDecimals,
  currencyName,
  currencyOptions,
  hasCustomCurrencyFacts,
  markupProblem,
  rateProblem,
} from '../lib/currencies';
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

export interface CurrencyDialogProps {
  /** The currency to edit; leave out to add one. */
  currency?: Currency;
  /** The codes already in the list, which the Add menu does not offer again. */
  existingCodes?: readonly string[];
  onClose: () => void;
}

/** Adds a currency, or edits the one it is given. */
export function CurrencyDialog({ currency, existingCodes = [], onClose }: CurrencyDialogProps) {
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
    setValue,
    formState: { errors },
  } = form;
  // Set once the person types in Decimals: from then on choosing another code leaves their number alone.
  const decimalsTyped = useRef(false);

  const submit = dialogSubmit(
    form,
    async (values) => {
      if (!currency) {
        const code = values.code.trim().toUpperCase();
        await create.mutateAsync({
          code,
          name: currencyName(code),
          rateToBase: values.rateToBase.trim(),
          markupPercent: values.markupPercent.trim(),
          charmRounding: values.charmRounding,
          isStorefront: values.isStorefront,
          decimals: Number(values.decimals),
        });
        return;
      }
      const body: UpdateCurrencyBody = {};
      if (values.name.trim() !== currency.name) body.name = values.name.trim();
      if (!sameDecimal(values.rateToBase, currency.rateToBase)) body.rateToBase = values.rateToBase.trim();
      if (!sameDecimal(values.markupPercent, currency.markupPercent))
        body.markupPercent = values.markupPercent.trim();
      if (Number(values.decimals) !== currency.decimals) body.decimals = Number(values.decimals);
      if (values.charmRounding !== currency.charmRounding) body.charmRounding = values.charmRounding;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ currency, body });
    },
    {
      // Adding has no Name input, so a message about the name falls to the dialog's error slot.
      fields: currency
        ? ['code', 'name', 'rateToBase', 'markupPercent', 'decimals', 'charmRounding', 'isStorefront']
        : ['code', 'rateToBase', 'markupPercent', 'decimals', 'charmRounding', 'isStorefront'],
    },
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
          <SelectField
            label="Code"
            selectWrapClassName="w-full"
            options={currencyOptions(existingCodes)}
            hint="The name and the decimals follow from the code. Currencies already in the list are not offered."
            autoFocus
            error={errors.code}
            {...register('code', {
              validate: (v) => v !== '' || 'Choose a currency.',
              // The decimals follow the code until the person has typed in them.
              onChange: (event: { target: { value: string } }) => {
                if (!decimalsTyped.current)
                  setValue('decimals', String(currencyDecimals(event.target.value)));
              },
            })}
          />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Rate (per $1)"
            className="mono"
            inputMode="decimal"
            autoComplete="off"
            autoFocus={currency !== undefined}
            hint="How many of this currency make 1 US dollar. Refresh rates only fills it when automatic rates are on; type it otherwise."
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
        <MoreOptions
          defaultOpen={currency !== undefined && hasCustomCurrencyFacts(currency)}
          forceOpen={Boolean(errors.name || errors.decimals)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {currency && (
              <TextField
                label="Name"
                autoComplete="off"
                error={errors.name}
                {...register('name', { validate: (v) => v.trim() !== '' || 'Enter a name.' })}
              />
            )}
            <TextField
              label="Decimals"
              inputMode="numeric"
              autoComplete="off"
              hint={
                currency
                  ? 'How many decimals prices show.'
                  : 'How many decimals prices show. It follows the code until you type here.'
              }
              error={errors.decimals}
              {...register('decimals', {
                validate: (v) => /^[0-4]$/.test(v.trim()) || 'Enter 0 to 4.',
                onChange: () => {
                  decimalsTyped.current = true;
                },
              })}
            />
          </div>
        </MoreOptions>
      </div>
    </FormDialog>
  );
}
