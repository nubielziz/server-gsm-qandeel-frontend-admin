// ListingSeoFields: the search-engine title and description of a listing page (this language). New in feature 22.
import { TextField } from '@/components/ui';
import { LISTING_LIMITS, type ListingFieldsProps } from '../lib/listingForm';

/** The two search texts; an empty text clears them. */
export function ListingSeoFields({ register, errors, dir }: ListingFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField
        label="Search title"
        dir={dir}
        autoComplete="off"
        maxLength={LISTING_LIMITS.seoTitle}
        hint="What Google shows as the headline."
        error={errors.seoTitle}
        {...register('seoTitle')}
      />
      <TextField
        label="Search description"
        dir={dir}
        autoComplete="off"
        maxLength={LISTING_LIMITS.seoDescription}
        hint="The line under the headline."
        error={errors.seoDescription}
        {...register('seoDescription')}
      />
    </div>
  );
}
