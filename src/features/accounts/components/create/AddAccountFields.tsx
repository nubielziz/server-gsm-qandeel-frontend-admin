// AddAccountFields: the rows of +Add Account, label on the left and control on the right (the layout the owner asked for): Name, Email, Rank,
// Country, Phone, then Company and Credit limit for a merchant rank, then how the password is given. The Rank menu decides which rows are
// there: a retail account has a country picked from the shop's list and no company or credit; a merchant rank has a country picked from
// every ISO country (decision 035), a company and (when the rank allows credit) a credit limit. It owns no request: the save belongs to the view.
import { Controller, useController, type UseFormReturn } from 'react-hook-form';
import { Link } from 'react-router';
import { CountryField, FormRow, PhoneField, SelectField, TextField } from '@/components/ui';
import { accountsListPath } from '../../lib/paths';
import type { Rank } from '../../types';
import type { AccountGrants } from '../frame/useAccountGrants';
import { countryOptions, merchantCountryOptions } from '../shared/countries';
import { PasswordHowRow } from '../security/PasswordHowRow';
import {
  allowsCredit,
  chosenRank,
  choiceKind,
  cleanEmail,
  DEFAULT_RETAIL_COUNTRY,
  GUEST_EMAIL_WORDS,
  parseCreditLimit,
  rankChoices,
  validCountry,
  validEmail,
  validName,
  type AddAccountValues,
} from './addAccountForm';

/** The ranks the form offers: what `useRanks` answers (a read of the `client-groups` resource, only with `groups:read`). */
export type RankList = { ranks: readonly Rank[]; query: { isLoading: boolean; isError: boolean } };

export interface AddAccountFieldsProps {
  form: UseFormReturn<AddAccountValues>;
  grants: AccountGrants;
  ranks: RankList;
}

const EMAIL_ID = 'add-account-email';

// What the Rank menu says under itself, most important first.
function rankHint(grants: AccountGrants, ranks: RankList): string | undefined {
  if (!grants.can('groups:read')) return 'You need the groups:read permission to list the ranks';
  if (ranks.query.isLoading) return 'Loading the ranks…';
  if (ranks.query.isError) return 'The ranks could not be read, so only the retail rank is offered.';
  return grants.isOwner ? undefined : 'Only the Owner gives a merchant rank.';
}

/** The rows, with the checks that run before the server is called. */
export function AddAccountFields({ form, grants, ranks }: AddAccountFieldsProps) {
  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = form;
  const choice = watch('rank');
  const retail = choiceKind(choice) === 'retail';
  const rank = chosenRank(ranks.ranks, choice);
  const creditLock = grants.needs('wallet:credit_limit');
  // The country menu and the phone box are not native inputs: the form drives them through a controller (decision 040).
  const { field: country } = useController({
    name: 'country',
    control,
    // A retail account's menu has no empty choice; a merchant must pick one of every ISO country.
    rules: retail ? {} : { validate: (value) => validCountry(value) || 'Choose a country.' },
  });
  const { field: phone } = useController({ name: 'phone', control });

  // A kind change starts the country over: a retail account picks one of the shop's, a merchant picks from every ISO country.
  function chooseRank(next: string) {
    if (choiceKind(next) !== choiceKind(choice)) {
      setValue('country', choiceKind(next) === 'retail' ? DEFAULT_RETAIL_COUNTRY : '');
    }
  }

  const emailError =
    errors.email?.type === 'guest' ? (
      <>
        {GUEST_EMAIL_WORDS}{' '}
        <Link className="link" to={accountsListPath({ chip: 'guests', q: cleanEmail(getValues('email')) })}>
          Open the guest
        </Link>
      </>
    ) : (
      errors.email?.message
    );

  return (
    <>
      <TextField
        layout="row"
        label="Name"
        required
        autoComplete="off"
        maxLength={120}
        error={errors.name}
        {...register('name', { validate: (value) => validName(value) || 'Enter a name.' })}
      />
      <FormRow
        label="Email"
        htmlFor={EMAIL_ID}
        required
        hint="The sign-in address. It must not belong to another account with a login."
        error={emailError}
      >
        <input
          id={EMAIL_ID}
          className="input row-control aria-[invalid=true]:border-crit-dot"
          type="text"
          inputMode="email"
          autoComplete="off"
          spellCheck={false}
          placeholder="name@example.com"
          required
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${EMAIL_ID}-hint ${EMAIL_ID}-error` : `${EMAIL_ID}-hint`}
          {...register('email', {
            validate: (value) => validEmail(value) || 'Enter a valid email address.',
          })}
        />
      </FormRow>
      <SelectField
        layout="row"
        label="Rank"
        required
        selectWrapClassName="w-full max-w-md"
        options={rankChoices(ranks.ranks, grants.isOwner)}
        hint={rankHint(grants, ranks)}
        error={errors.rank}
        {...register('rank', { onChange: (event) => chooseRank(event.target.value) })}
      />
      {/* A retail account picks one of the shop's countries, a merchant one of every ISO country; the Rank menu sets the value when the kind changes. */}
      <CountryField
        layout="row"
        label="Country"
        required
        selectWrapClassName="w-full max-w-md"
        options={retail ? countryOptions() : merchantCountryOptions()}
        hint={retail ? 'Sets the currency and VAT of their orders.' : undefined}
        error={errors.country}
        ref={country.ref}
        name={country.name}
        value={country.value}
        onValueChange={country.onChange}
        onBlur={country.onBlur}
      />
      <PhoneField
        layout="row"
        label="Phone"
        hint="Optional."
        error={errors.phone}
        ref={phone.ref}
        name={phone.name}
        value={phone.value}
        onValueChange={phone.onChange}
        onBlur={phone.onBlur}
        countryHint={country.value}
      />
      {!retail && (
        <TextField
          layout="row"
          label="Company"
          autoComplete="off"
          hint="Optional."
          error={errors.company}
          {...register('company')}
        />
      )}
      {allowsCredit(rank) && (
        <TextField
          layout="row"
          label="Credit limit"
          inputMode="decimal"
          placeholder="0.00"
          autoComplete="off"
          disabled={creditLock.disabled}
          title={creditLock.title}
          hint={creditLock.title ?? 'In USD: how far below zero the wallet may go. Leave it empty for none.'}
          error={errors.creditLimit}
          {...register('creditLimit', {
            validate: (value) =>
              value.trim() === '' ||
              parseCreditLimit(value) !== null ||
              'Enter an amount like 500.00, or leave it empty.',
          })}
        />
      )}
      <Controller
        control={control}
        name="mode"
        render={({ field }) => (
          <PasswordHowRow
            id="add-account-how"
            value={field.value}
            onChange={field.onChange}
            lock={grants.needs('clients:security')}
          />
        )}
      />
      <FormRow label={null}>
        <p className="text-xs italic text-ink3">
          Marketing emails stay off. Only the person can agree to them.
        </p>
      </FormRow>
    </>
  );
}
