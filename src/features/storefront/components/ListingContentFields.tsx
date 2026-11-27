// ListingContentFields: the text of the listing editor (title, address, summary, description and requirements as Markdown). New in
// feature 22; the demo had no editor. It is drawn stacked in the dialogs and as label-left rows in the Product / Services edit view
// (the `layout` prop). The address is shown, not typed (decision 036); the delivery note sits in the "More options" fold.
import { TextareaField, TextField, ReadField } from '@/components/ui';
import { LISTING_LIMITS, type ListingFieldsProps } from '../lib/listingForm';

export interface ListingContentFieldsProps extends ListingFieldsProps {
  /** The address of the shop page. It is shown as it is and never sent in an update: the server made it. */
  slug: string;
}

/** The title, the address (read only), the one-line summary and the two Markdown texts. */
export function ListingContentFields({
  register,
  errors,
  slug,
  layout = 'stacked',
}: ListingContentFieldsProps) {
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
        <ReadField
          label="Address (slug)"
          layout={layout}
          mono
          hint="The web address of the page. The server made it and it is not changed here."
        >
          {slug}
        </ReadField>
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
