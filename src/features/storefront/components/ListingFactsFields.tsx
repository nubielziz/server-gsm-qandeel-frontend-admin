// ListingFactsFields: the facts about the service itself (brand, carrier, country, featured, position). New in feature 22.
import { CheckboxField, TextField } from '@/components/ui';
import {
  isCountryText,
  isPosition,
  LISTING_LIMITS,
  MAX_SORT,
  type ListingFieldsProps,
} from '../lib/listingForm';

/** The five facts about the service. */
export function ListingFactsFields({ register, errors }: ListingFieldsProps) {
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="label">About the service</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Brand"
          autoComplete="off"
          maxLength={LISTING_LIMITS.brand}
          hint="For example Apple."
          error={errors.brand}
          {...register('brand')}
        />
        <TextField
          label="Carrier"
          autoComplete="off"
          maxLength={LISTING_LIMITS.carrier}
          hint="The network the service unlocks."
          error={errors.carrier}
          {...register('carrier')}
        />
        <TextField
          label="Country"
          className="mono uppercase"
          autoComplete="off"
          spellCheck={false}
          maxLength={2}
          hint="Two letters, like GB, or empty."
          error={errors.country}
          {...register('country', {
            validate: (value) =>
              isCountryText(value) || 'Use a two-letter country code like GB, or leave it empty.',
          })}
        />
        <TextField
          label="Position"
          inputMode="numeric"
          autoComplete="off"
          hint="Lower numbers come first in the shop."
          error={errors.sort}
          {...register('sort', {
            validate: (value) =>
              isPosition(value) || `Enter a whole number from 0 to ${MAX_SORT.toLocaleString('en-US')}.`,
          })}
        />
      </div>
      <CheckboxField
        label="Featured on the storefront"
        error={errors.isFeatured}
        {...register('isFeatured')}
      />
    </fieldset>
  );
}
