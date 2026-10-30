// TaxRateDialog: "Add tax rate" and "Edit <country> tax" (`POST` and `PATCH /admin/tax-rates`): the rate, the kind of tax, the scheme it is
// reported through and the dates it applies. The demo's table was read-only; the map adds this form. Only what changed is sent on an edit.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, SelectField, TextField, toast } from '@/components/ui';
import { useCreateTaxRate, useUpdateTaxRate } from '../hooks/useTaxRates';
import { isDecimalText, sameDecimal, trimDecimal } from '../lib/decimal';
import { countryName, fromDateInput, TAX_TYPE_OPTIONS, toDateInput } from '../lib/tax';
import type { CreateTaxRateBody, TaxRate, UpdateTaxRateBody } from '../types';

type Values = {
  country: string;
  region: string;
  ratePercent: string;
  taxType: string;
  appliesTo: string;
  label: string;
  ossScheme: string;
  validFrom: string;
  validTo: string;
};

const FIELDS = [
  'country',
  'region',
  'ratePercent',
  'taxType',
  'appliesTo',
  'label',
  'ossScheme',
  'validFrom',
  'validTo',
];

/** The values of the form as a create body. */
function toBody(values: Values): CreateTaxRateBody {
  return {
    country: values.country.trim().toUpperCase(),
    region: values.region.trim(),
    ratePercent: values.ratePercent.trim(),
    taxType: values.taxType,
    appliesTo: values.appliesTo.trim(),
    label: values.label.trim(),
    ossScheme: values.ossScheme.trim(),
    validFrom: fromDateInput(values.validFrom),
    validTo: fromDateInput(values.validTo),
  };
}

/** Only the fields of `next` that differ from the saved rate. */
function changes(next: CreateTaxRateBody, saved: TaxRate): UpdateTaxRateBody {
  const body: UpdateTaxRateBody = {};
  for (const key of ['region', 'taxType', 'appliesTo', 'label', 'ossScheme'] as const) {
    if (next[key] !== saved[key]) body[key] = next[key];
  }
  if (!sameDecimal(next.ratePercent, saved.ratePercent)) body.ratePercent = next.ratePercent;
  for (const key of ['validFrom', 'validTo'] as const) {
    if (toDateInput(next[key]) !== toDateInput(saved[key])) body[key] = next[key];
  }
  return body;
}

/** Adds a tax rate, or edits the one it is given. */
export function TaxRateDialog({ rate, onClose }: { rate?: TaxRate; onClose: () => void }) {
  const create = useCreateTaxRate();
  const update = useUpdateTaxRate();
  const form = useForm<Values>({
    defaultValues: {
      country: rate?.country ?? '',
      region: rate?.region ?? '',
      ratePercent: rate ? trimDecimal(rate.ratePercent) : '',
      taxType: rate?.taxType ?? 'vat',
      appliesTo: rate?.appliesTo ?? 'digital_services',
      label: rate?.label ?? '',
      ossScheme: rate?.ossScheme ?? '',
      validFrom: toDateInput(rate?.validFrom ?? null),
      validTo: toDateInput(rate?.validTo ?? null),
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const next = toBody(values);
      if (!rate) {
        await create.mutateAsync(next);
        return;
      }
      const body = changes(next, rate);
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ rate, body });
    },
    { fields: FIELDS },
  );

  return (
    <FormDialog
      open
      title={rate ? `Edit ${countryName(rate.country)} tax` : 'Add tax rate'}
      sub="A new rate starts on its date; the old one keeps applying to orders placed before it."
      confirm={rate ? 'Save changes' : 'Add tax rate'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Country code"
            autoComplete="off"
            maxLength={2}
            readOnly={rate !== undefined}
            autoFocus={!rate}
            hint={rate ? undefined : 'Two letters, such as GB.'}
            error={errors.country}
            {...register('country', {
              validate: (v) => /^[A-Za-z]{2}$/.test(v.trim()) || 'Enter the two-letter country code.',
            })}
          />
          <TextField
            label="Region"
            autoComplete="off"
            hint="Optional, for a state or province."
            error={errors.region}
            {...register('region')}
          />
          <TextField
            label="Rate (%)"
            inputMode="decimal"
            autoComplete="off"
            error={errors.ratePercent}
            {...register('ratePercent', {
              validate: (v) => (isDecimalText(v) && Number(v) <= 100) || 'Enter a rate from 0 to 100.',
            })}
          />
          <SelectField
            label="Kind of tax"
            selectWrapClassName="w-full"
            options={TAX_TYPE_OPTIONS}
            error={errors.taxType}
            {...register('taxType')}
          />
          <TextField
            label="Rate applies from"
            type="date"
            error={errors.validFrom}
            {...register('validFrom', { validate: (v) => v !== '' || 'Enter the date the rate starts.' })}
          />
          <TextField
            label="Until"
            type="date"
            hint="Leave empty if it has no end."
            error={errors.validTo}
            {...register('validTo')}
          />
        </div>
        <TextField
          label="Reported through"
          autoComplete="off"
          hint="For example EU OSS or UK VAT. Leave empty if the tax is not collected."
          error={errors.ossScheme}
          {...register('ossScheme')}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Applies to"
            autoComplete="off"
            error={errors.appliesTo}
            {...register('appliesTo')}
          />
          <TextField
            label="Label"
            autoComplete="off"
            hint="Shown on invoices."
            error={errors.label}
            {...register('label')}
          />
        </div>
      </div>
    </FormDialog>
  );
}
