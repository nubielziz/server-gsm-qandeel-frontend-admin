// ListingContentFields: the text of the listing editor (title, slug, summary, delivery note, description and
// requirements as Markdown). New in feature 22; the demo had no editor. It is drawn stacked in the dialogs and as label-left rows in
// the Product / Services edit view (the `layout` prop).
import { TextareaField, TextField } from '@/components/ui';
import { LISTING_LIMITS, type ListingFieldsProps } from '../lib/listingForm';

/** The title, the web address, the one-line summary, the delivery note and the two Markdown texts. */
export function ListingContentFields({ register, errors, layout = 'stacked' }: ListingFieldsProps) {
  const row = layout === 'row';
  // A row's text control stops at 28rem; the two Markdown boxes are wider, as they hold paragraphs.
  const wide = row ? 'max-w-2xl' : undefined;
  return (
    <div className={row ? undefined : 'space-y-3'}>
      <div className={row ? undefined : 'grid gap-3 sm:grid-cols-2'}>
        <TextField
          label="Public title"
          layout={layout}
          autoComplete="off"
          maxLength={LISTING_LIMITS.publicTitle}
          error={errors.publicTitle}
          {...register('publicTitle', {
            validate: (value) => value.trim() !== '' || 'Enter the title customers see.',
          })}
        />
        <TextField
          label="Slug"
          layout={layout}
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
        layout={layout}
        autoComplete="off"
        maxLength={LISTING_LIMITS.summary}
        hint="One line under the title, up to 300 characters."
        error={errors.summary}
        {...register('summary')}
      />
      <TextField
        label="Delivery note"
        layout={layout}
        autoComplete="off"
        maxLength={LISTING_LIMITS.etaText}
        hint="Shown to customers instead of the service's delivery time, for example “Usually within 24 hours”. Leave empty to show the delivery time."
        error={errors.etaText}
        {...register('etaText')}
      />
      <TextareaField
        label="Description (Markdown)"
        layout={layout}
        className={wide ? `mono ${wide}` : 'mono'}
        rows={8}
        spellCheck={false}
        maxLength={LISTING_LIMITS.descriptionMd}
        error={errors.descriptionMd}
        {...register('descriptionMd')}
      />
      <TextareaField
        label="Requirements (Markdown)"
        layout={layout}
        className={wide ? `mono ${wide}` : 'mono'}
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
