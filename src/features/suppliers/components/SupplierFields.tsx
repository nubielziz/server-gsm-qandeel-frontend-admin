// SupplierFields: the fields of the connection form, shared by "Connect supplier" and "Edit connection": name, API type, base
// URL, account name, API key, currency, the balance alert and the limits. Ports the fields of `sup-connect` in
// 44-p-suppliers.js (name, API type, base URL, key) and adds the ones the table keeps (MISMATCHES M67). The server validates again.
import type { UseFormReturn } from 'react-hook-form';
import { SelectField, TextField } from '@/components/ui';
import { DRIVERS } from '../lib/connection';
import { cleanName, isPositiveInt, moneyText, validBaseUrl, type SupplierFormValues } from '../lib/input';

/** A limit may stay empty (the server keeps its value); when it is filled it must be a whole number of at least one. */
const limitRule = (value: string) =>
  value.trim() === '' || isPositiveInt(value) || 'Use a whole number, 1 or more.';

export interface SupplierFieldsProps {
  form: Pick<UseFormReturn<SupplierFormValues>, 'register' | 'formState'>;
  /** Editing keeps the stored key unless a new one is typed. */
  editing: boolean;
}

/** The fields, registered on the caller's react-hook-form. The rules are hints; the server's field errors show under the fields. */
export function SupplierFields({ form, editing }: SupplierFieldsProps) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="space-y-3">
      <TextField
        label="Name"
        autoComplete="off"
        placeholder="e.g. Atlas IMEI"
        error={errors.name}
        {...register('name', {
          validate: (value) => cleanName(value).length >= 2 || 'Enter a supplier name.',
        })}
      />
      <SelectField
        label="API type"
        selectWrapClassName="w-full"
        options={DRIVERS}
        error={errors.driver}
        {...register('driver')}
      />
      <TextField
        label="Base URL"
        autoComplete="off"
        spellCheck={false}
        inputMode="url"
        placeholder="https://api.example.com"
        error={errors.baseUrl}
        {...register('baseUrl', {
          validate: (value) => validBaseUrl(value) || 'Enter a valid URL, like https://api.example.com.',
        })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Username"
          autoComplete="off"
          spellCheck={false}
          hint="The account name at the supplier."
          error={errors.username}
          {...register('username')}
        />
        <TextField
          label="API key"
          type="password"
          autoComplete="new-password"
          spellCheck={false}
          hint={
            editing
              ? 'Leave empty to keep the current key. A new key replaces it.'
              : 'Stored encrypted. Shown masked after saving.'
          }
          error={errors.apiKey}
          {...register('apiKey', {
            validate: (value) => editing || value.trim() !== '' || 'Enter the API key.',
          })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Currency"
          autoComplete="off"
          maxLength={3}
          hint="Three letters, like USD."
          error={errors.currency}
          {...register('currency', {
            validate: (value) => /^[a-z]{3}$/i.test(value.trim()) || 'Use a three-letter currency code.',
          })}
        />
        <TextField
          label="Alert below (prepaid)"
          inputMode="decimal"
          autoComplete="off"
          placeholder="150.00"
          hint="A low-balance alert starts under this amount."
          error={errors.lowBalanceAlert}
          {...register('lowBalanceAlert', {
            validate: (value) =>
              value.trim() === '' || moneyText(value) !== null || 'Enter an amount, like 150.00.',
          })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="At a time"
          inputMode="numeric"
          autoComplete="off"
          placeholder="5"
          error={errors.maxConcurrency}
          {...register('maxConcurrency', { validate: limitRule })}
        />
        <TextField
          label="Per minute"
          inputMode="numeric"
          autoComplete="off"
          placeholder="60"
          error={errors.rateLimitPerMin}
          {...register('rateLimitPerMin', { validate: limitRule })}
        />
        <TextField
          label="Timeout (ms)"
          inputMode="numeric"
          autoComplete="off"
          placeholder="15000"
          error={errors.timeoutMs}
          {...register('timeoutMs', { validate: limitRule })}
        />
      </div>
    </div>
  );
}
