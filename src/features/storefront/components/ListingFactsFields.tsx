// ListingFactsFields: the facts about the service itself (brand, carrier, country, featured, position). New in feature 22.
// Since 2026-11-17 the brand is picked from the brands the shop has a logo for (or typed by hand under "Other"), and the
// country from the Arab countries. Stacked in a two-column grid in the dialogs; label-left rows in the Product / Services edit view.
import { useMemo, useState } from 'react';
import { useController, type Control } from 'react-hook-form';
import { CheckboxField, SelectField, TextField } from '@/components/ui';
import { BRAND_OPTIONS, countryOptions, OTHER_BRAND, shopBrand } from '../lib/listingFacts';
import {
  isCountryText,
  isPosition,
  LISTING_LIMITS,
  MAX_SORT,
  type ListingFieldsProps,
  type ListingFormValues,
} from '../lib/listingForm';

export interface ListingFactsFieldsProps extends ListingFieldsProps {
  control: Control<ListingFormValues>;
  /** The listing's country when the editor opened: it stays selectable when it is not an Arab country. */
  savedCountry: string;
}

/** The five facts about the service. */
export function ListingFactsFields({
  register,
  errors,
  control,
  savedCountry,
  layout = 'stacked',
}: ListingFactsFieldsProps) {
  const { field: brand } = useController({ name: 'brand', control });
  // "Other" is a mode of its own: an empty name typed by hand must not jump back to "No brand" while the box is open.
  const [typed, setTyped] = useState(() => brand.value.trim() !== '' && shopBrand(brand.value) === null);
  const countries = useMemo(() => countryOptions(savedCountry), [savedCountry]);
  const picked = typed ? OTHER_BRAND : (shopBrand(brand.value) ?? '');
  const row = layout === 'row';
  // A select in a row stops at a readable width; stacked it fills its grid cell.
  const selectWrap = row ? 'w-full max-w-md' : 'w-full';

  return (
    <fieldset className={row ? 'min-w-0' : 'min-w-0 space-y-3'}>
      <legend className={row ? 'pt-3 text-sm font-semibold text-ink' : 'label'}>About the service</legend>
      <div className={row ? undefined : 'grid gap-3 sm:grid-cols-2'}>
        <div className={row ? 'min-w-0' : 'min-w-0 space-y-2'}>
          <SelectField
            label="Brand"
            layout={layout}
            selectWrapClassName={selectWrap}
            options={BRAND_OPTIONS}
            value={picked}
            hint="The brands the shop has a logo for. Choose Other to type a name of your own."
            error={typed ? undefined : errors.brand}
            onBlur={brand.onBlur}
            onChange={(event) => {
              const value = event.target.value;
              if (value === OTHER_BRAND) {
                // A name picked from the list is not what "Other" means: the box starts empty.
                if (!typed) brand.onChange('');
                setTyped(true);
                return;
              }
              setTyped(false);
              brand.onChange(value);
            }}
          />
          {typed && (
            <TextField
              label="Brand name"
              layout={layout}
              autoComplete="off"
              maxLength={LISTING_LIMITS.brand}
              hint="As customers know it, for example Apple."
              error={errors.brand}
              name={brand.name}
              ref={brand.ref}
              value={brand.value}
              onBlur={brand.onBlur}
              onChange={brand.onChange}
            />
          )}
        </div>
        <TextField
          label="Carrier"
          layout={layout}
          autoComplete="off"
          maxLength={LISTING_LIMITS.carrier}
          hint="The network the service unlocks."
          error={errors.carrier}
          {...register('carrier')}
        />
        <SelectField
          label="Country"
          layout={layout}
          selectWrapClassName={selectWrap}
          options={countries}
          hint="The Arab countries. Leave it at No country when the service is not for one country."
          error={errors.country}
          {...register('country', {
            validate: (value) =>
              isCountryText(value) || 'Use a two-letter country code like GB, or leave it empty.',
          })}
        />
        <TextField
          label="Position"
          layout={layout}
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
        layout={layout}
        error={errors.isFeatured}
        {...register('isFeatured')}
      />
    </fieldset>
  );
}
