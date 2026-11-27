// ProfileFields: the rows of the Profile part, label on the left and box on the right (the layout the owner asked for): name, email, phone,
// country, company, address, tax number, internal notes and the API username. It owns no request: the save belongs to the part.
import type { UseFormReturn } from 'react-hook-form';
import { FormRow, ReadValue, SectionHeading, SelectField, TextareaField, TextField } from '@/components/ui';
import { countryOptions, merchantCountryOptions } from '../shared/countries';
import type { AccountDetail } from '../../types';
import {
  PROFILE_LIMITS,
  tidyName,
  tooLong,
  validCountry,
  validEmail,
  type ProfileValues,
} from './profileForm';

export interface ProfileFieldsProps {
  form: UseFormReturn<ProfileValues>;
  account: AccountDetail;
  /** A missing `clients:update`: every box is off, and the part says why. */
  lock: { disabled: boolean; title?: string };
  /** The email of a login account needs `clients:security`: the box is read-only and the row says why. */
  emailLock: { disabled: boolean; title?: string };
}

// A check against one of the server's limits, as a react-hook-form validator.
const within = (limit: number) => (value: string) => tooLong(value, limit) ?? true;

/** The inputs of the Profile part with the checks that run before the server is called. */
export function ProfileFields({ form, account, lock, emailLock }: ProfileFieldsProps) {
  const {
    register,
    formState: { errors },
  } = form;
  const merchant = account.rank.kind === 'merchant';
  const emailHint = emailLock.disabled
    ? emailLock.title
    : account.hasAccount
      ? 'Changing it sends a new verification link and cancels older links.'
      : 'Receipts and the order link are sent here.';
  return (
    <fieldset disabled={lock.disabled} className="min-w-0">
      <SectionHeading as="h3">Profile</SectionHeading>
      <TextField
        layout="row"
        label="Name"
        required
        autoComplete="off"
        error={errors.name}
        {...register('name', {
          validate: (value) =>
            tidyName(value) === ''
              ? 'Enter a name.'
              : (tooLong(tidyName(value), PROFILE_LIMITS.name) ?? true),
        })}
      />
      <TextField
        layout="row"
        label="Email"
        required
        type="text"
        inputMode="email"
        autoComplete="off"
        spellCheck={false}
        readOnly={emailLock.disabled}
        title={emailLock.disabled ? emailLock.title : undefined}
        hint={emailHint}
        error={errors.email}
        {...register('email', {
          validate: (value) => validEmail(value) || 'Enter a valid email address, like owner@example.com.',
        })}
      />
      <TextField
        layout="row"
        label="Phone"
        type="text"
        inputMode="tel"
        autoComplete="off"
        error={errors.phone}
        {...register('phone', { validate: within(PROFILE_LIMITS.phone) })}
      />
      {merchant ? (
        <SelectField
          layout="row"
          label="Country"
          selectWrapClassName="w-full max-w-md"
          options={merchantCountryOptions(account.country ?? '')}
          error={errors.country}
          {...register('country', {
            validate: (value) => validCountry(value) || 'Choose a country.',
          })}
        />
      ) : (
        <SelectField
          layout="row"
          label="Country"
          selectWrapClassName="w-full max-w-md"
          options={countryOptions(account.country)}
          hint="Applies to new orders. Past orders keep their price and VAT."
          error={errors.country}
          {...register('country')}
        />
      )}
      {(merchant || account.company.trim() !== '') && (
        <TextField
          layout="row"
          label="Company"
          autoComplete="off"
          error={errors.company}
          {...register('company', { validate: within(PROFILE_LIMITS.company) })}
        />
      )}
      <TextareaField
        layout="row"
        label="Address"
        rows={2}
        error={errors.address}
        {...register('address', { validate: within(PROFILE_LIMITS.address) })}
      />
      <TextField
        layout="row"
        label="Tax number"
        autoComplete="off"
        error={errors.taxId}
        {...register('taxId', { validate: within(PROFILE_LIMITS.taxId) })}
      />
      <TextareaField
        layout="row"
        label="Internal notes"
        rows={3}
        placeholder="Only your team sees this"
        hint="Only your team sees this."
        error={errors.internalNotes}
        {...register('internalNotes', { validate: within(PROFILE_LIMITS.internalNotes) })}
      />
      {merchant && (
        <FormRow
          label="Username"
          hint="The login of this merchant's API programs. It cannot be changed here."
        >
          <ReadValue className="mono">{account.username ?? '–'}</ReadValue>
        </FormRow>
      )}
    </fieldset>
  );
}
