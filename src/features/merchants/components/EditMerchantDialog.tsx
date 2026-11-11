// EditMerchantDialog: "Edit <merchant>" (Profile tab, feature 20): name, company, email, phone, country, language, address, tax ID
// and internal notes. Only the changed fields are sent, and nothing at all when none changed. `EMAIL_TAKEN` shows under the email.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextareaField, TextField, dialogSubmit, toast } from '@/components/ui';
import { useUpdateClientDetails } from '../hooks/useClientMutations';
import {
  changedDetails,
  DETAIL_LIMITS,
  detailDefaults,
  LOCALES,
  tidyName,
  tooLong,
  type DetailValues,
} from '../lib/details';
import { validCountry, validEmail } from '../lib/input';
import type { Client } from '../types';

const FIELDS = [
  'name',
  'company',
  'email',
  'phone',
  'country',
  'locale',
  'address',
  'taxId',
  'internalNotes',
] as const;

/** The form for editing a merchant's details. Mounted only while open. */
export function EditMerchantDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const update = useUpdateClientDetails();
  const form = useForm<DetailValues>({ defaultValues: detailDefaults(client) });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const body = changedDetails(client, values);
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ client, body });
    },
    { fields: FIELDS, codeFields: { EMAIL_TAKEN: 'email' } },
  );

  const limit = (key: keyof typeof DETAIL_LIMITS) => (value: string) =>
    tooLong(value, DETAIL_LIMITS[key]) ?? true;

  return (
    <FormDialog
      open
      title={`Edit ${client.name}`}
      sub="Changes are written to the audit log."
      confirm="Save changes"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Name"
          autoComplete="off"
          error={errors.name}
          {...register('name', {
            validate: (value) =>
              tidyName(value) === ''
                ? 'Enter a name.'
                : (tooLong(tidyName(value), DETAIL_LIMITS.name) ?? true),
          })}
        />
        <TextField
          label="Company"
          autoComplete="off"
          error={errors.company}
          {...register('company', { validate: limit('company') })}
        />
        <TextField
          label="Email"
          wrapperClassName="sm:col-span-2"
          type="text"
          inputMode="email"
          autoComplete="off"
          spellCheck={false}
          hint="Changing the email sends a new verification link and cancels older links. The merchant stays signed in."
          error={errors.email}
          {...register('email', {
            validate: (value) => validEmail(value) || 'Enter a valid email address, like owner@example.com.',
          })}
        />
        <TextField
          label="Phone"
          type="text"
          inputMode="tel"
          autoComplete="off"
          error={errors.phone}
          {...register('phone', { validate: limit('phone') })}
        />
        <TextField
          label="Country"
          maxLength={2}
          autoComplete="off"
          hint="Two letters, like JO or AE."
          error={errors.country}
          {...register('country', {
            validate: (value) => validCountry(value) || 'Enter the two-letter country code.',
          })}
        />
        <SelectField
          label="Language"
          selectWrapClassName="w-full"
          options={LOCALES}
          hint="The language of the mails the merchant receives."
          error={errors.locale}
          {...register('locale')}
        />
        <TextField
          label="Tax ID"
          autoComplete="off"
          error={errors.taxId}
          {...register('taxId', { validate: limit('taxId') })}
        />
        <TextareaField
          label="Address"
          wrapperClassName="sm:col-span-2"
          rows={2}
          error={errors.address}
          {...register('address', { validate: limit('address') })}
        />
        <TextareaField
          label="Internal notes"
          wrapperClassName="sm:col-span-2"
          rows={3}
          placeholder="Only your team sees this"
          error={errors.internalNotes}
          {...register('internalNotes', { validate: limit('internalNotes') })}
        />
      </div>
    </FormDialog>
  );
}
