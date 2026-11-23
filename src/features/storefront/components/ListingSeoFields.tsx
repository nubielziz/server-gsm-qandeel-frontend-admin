// ListingSeoFields: the search-engine title and description of a listing page. New in feature 22. Stacked in the dialogs, label-left rows
// under a small heading in the Product / Services edit view (the `layout` prop).
import { TextField } from '@/components/ui';
import { LISTING_LIMITS, type ListingFieldsProps } from '../lib/listingForm';

/** The two search texts; an empty text clears them. */
export function ListingSeoFields({ register, errors, layout = 'stacked' }: ListingFieldsProps) {
  const fields = (
    <>
      <TextField
        label="Search title"
        layout={layout}
        autoComplete="off"
        maxLength={LISTING_LIMITS.seoTitle}
        hint="What Google shows as the headline."
        error={errors.seoTitle}
        {...register('seoTitle')}
      />
      <TextField
        label="Search description"
        layout={layout}
        autoComplete="off"
        maxLength={LISTING_LIMITS.seoDescription}
        hint="The line under the headline."
        error={errors.seoDescription}
        {...register('seoDescription')}
      />
    </>
  );
  if (layout === 'row') {
    return (
      <fieldset className="min-w-0">
        <legend className="pt-3 text-sm font-semibold text-ink">Search engines</legend>
        {fields}
      </fieldset>
    );
  }
  return <div className="grid gap-3 sm:grid-cols-2">{fields}</div>;
}
