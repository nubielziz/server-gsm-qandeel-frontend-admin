// AddCustomerDialog: "Add a customer" (the demo's `cu-new` action): name, email, country, language, phone and how they get
// their first password. A temporary password is made by the server and shown once (see RevealPasswordDialog).
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FormDialog, RadioGroup, SelectField, TextField, dialogSubmit } from '@/components/ui';
import { useCreateCustomer } from '../hooks/useCustomerMutations';
import { countryOptions } from '../lib/countries';
import { cleanEmail, cleanName, validEmail } from '../lib/input';
import { LOCALES } from '../lib/status';
import type { CreateCustomerResult, PasswordMode } from '../types';
import { PASSWORD_MODES } from './passwordModes';

type Values = {
  name: string;
  email: string;
  country: string;
  locale: string;
  phone: string;
  mode: PasswordMode;
};
const FIELDS = ['name', 'email', 'country', 'locale', 'phone', 'mode'] as const;

export interface AddCustomerDialogProps {
  onClose: () => void;
  /** Called after the customer was added and the dialog closed, with the new customer (and a temporary password, once). */
  onCreated: (created: CreateCustomerResult) => void;
}

/**
 * The form behind "Add customer". It is mounted only while open, so every opening starts with empty fields; the customer
 * it created is handed on after the dialog has closed.
 */
export function AddCustomerDialog({ onClose, onCreated }: AddCustomerDialogProps) {
  const create = useCreateCustomer();
  // The dialog closes itself after a successful save; this remembers what was created so `onClose` can hand it on.
  const created = useRef<CreateCustomerResult | undefined>(undefined);
  const form = useForm<Values>({
    defaultValues: { name: '', email: '', country: 'GB', locale: 'en', phone: '', mode: 'reset_link' },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const phone = values.phone.trim();
      created.current = await create.mutateAsync({
        name: cleanName(values.name),
        email: cleanEmail(values.email),
        country: values.country,
        locale: values.locale,
        ...(phone ? { phone } : {}),
        password: { mode: values.mode },
      });
    },
    { fields: FIELDS, codeFields: { EMAIL_TAKEN: 'email' }, aliases: { 'password.mode': 'mode' } },
  );

  return (
    <FormDialog
      open
      title="Add a customer"
      sub="Creates a storefront account. Use it when someone asks you to sign them up, or orders by phone."
      confirm="Create customer"
      onClose={() => (created.current ? onCreated(created.current) : onClose())}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Full name"
            wrapperClassName="sm:col-span-2"
            autoComplete="off"
            error={errors.name}
            {...register('name', {
              validate: (value) => cleanName(value).length >= 2 || 'Enter the customer’s name.',
            })}
          />
          <TextField
            label="Email"
            wrapperClassName="sm:col-span-2"
            type="text"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            placeholder="name@example.com"
            hint="The result and receipts are sent here. It must not belong to another customer."
            error={errors.email}
            {...register('email', {
              validate: (value) => validEmail(value) || 'Enter a valid email address.',
            })}
          />
          <SelectField
            label="Country"
            selectWrapClassName="w-full"
            options={countryOptions()}
            hint="Sets the currency and VAT on their orders."
            error={errors.country}
            {...register('country')}
          />
          <SelectField
            label="Language"
            selectWrapClassName="w-full"
            options={LOCALES}
            error={errors.locale}
            {...register('locale')}
          />
          <TextField
            label="Phone (optional)"
            wrapperClassName="sm:col-span-2"
            type="text"
            inputMode="tel"
            autoComplete="off"
            error={errors.phone}
            {...register('phone')}
          />
        </div>
        <RadioGroup legend="Password" options={PASSWORD_MODES} error={errors.mode} {...register('mode')} />
        <p className="text-xs text-ink3">Marketing emails stay off. Only the customer can agree to them.</p>
      </div>
    </FormDialog>
  );
}
