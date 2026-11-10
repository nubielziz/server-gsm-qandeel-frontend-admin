// ListingContentFields: the per-language text of the listing editor (title, slug, summary, delivery note, description and
// requirements as Markdown). New in feature 22; the demo had no editor. These texts belong to this language only.
import { TextareaField, TextField } from '@/components/ui';
import { LISTING_LIMITS, type ListingFieldsProps } from '../lib/listingForm';

/** The title, the web address, the one-line summary, the delivery note and the two Markdown texts. `dir` applies to the texts of this language, not to the slug. */
export function ListingContentFields({ register, errors, dir }: ListingFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Public title"
          dir={dir}
          autoComplete="off"
          maxLength={LISTING_LIMITS.publicTitle}
          error={errors.publicTitle}
          {...register('publicTitle', {
            validate: (value) => value.trim() !== '' || 'Enter the title customers see.',
          })}
        />
        <TextField
          label="Slug"
          className="mono"
          autoComplete="off"
          spellCheck={false}
          maxLength={LISTING_LIMITS.slug}
          hint="Lower-case words joined by hyphens. Changing it changes the public link."
          error={errors.slug}
          {...register('slug', { validate: (value) => value.trim() !== '' || 'Enter a slug.' })}
        />
      </div>
      <TextField
        label="Summary"
        dir={dir}
        autoComplete="off"
        maxLength={LISTING_LIMITS.summary}
        hint="One line under the title, up to 300 characters."
        error={errors.summary}
        {...register('summary')}
      />
      <TextField
        label="Delivery note"
        dir={dir}
        autoComplete="off"
        maxLength={LISTING_LIMITS.etaText}
        hint="Shown to customers instead of the service's delivery time, for example “Usually within 24 hours”. Leave empty to show the delivery time."
        error={errors.etaText}
        {...register('etaText')}
      />
      <TextareaField
        label="Description (Markdown)"
        dir={dir}
        className="mono"
        rows={8}
        spellCheck={false}
        maxLength={LISTING_LIMITS.descriptionMd}
        error={errors.descriptionMd}
        {...register('descriptionMd')}
      />
      <TextareaField
        label="Requirements (Markdown)"
        dir={dir}
        className="mono"
        rows={4}
        spellCheck={false}
        maxLength={LISTING_LIMITS.requirementsMd}
        hint="What the customer must have ready, such as the IMEI or the carrier."
        error={errors.requirementsMd}
        {...register('requirementsMd')}
      />
    </div>
  );
}
