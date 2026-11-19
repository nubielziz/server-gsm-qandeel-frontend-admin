// PublishItemFields: the text fields of the row dialog: the title, the address (slug), the brand, the carrier and the country. The
// server proposed them and works out the address from the title; staff may change any of them. A refusal lands under its field.
import type { UseFormReturn } from 'react-hook-form';
import { TextField } from '@/components/ui';
import type { ItemValues } from '../../lib/publishItemForm';

/** The five fields in a two-column grid; the title and the address take the full width. */
export function PublishItemFields({ form }: { form: UseFormReturn<ItemValues> }) {
  const { register, formState } = form;
  const { errors } = formState;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField
        label="Title"
        wrapperClassName="sm:col-span-2"
        maxLength={200}
        autoComplete="off"
        hint="What customers read. Up to 200 characters."
        error={errors.title}
        {...register('title')}
      />
      <TextField
        label="Address (slug)"
        wrapperClassName="sm:col-span-2"
        className="mono"
        maxLength={120}
        autoComplete="off"
        hint="Leave empty and the server makes it from the title."
        error={errors.slug}
        {...register('slug')}
      />
      <TextField
        label="Brand"
        maxLength={80}
        autoComplete="off"
        error={errors.brand}
        {...register('brand')}
      />
      <TextField
        label="Carrier"
        maxLength={80}
        autoComplete="off"
        error={errors.carrier}
        {...register('carrier')}
      />
      <TextField
        label="Country"
        maxLength={2}
        autoComplete="off"
        hint="Two letters, such as US."
        error={errors.country}
        {...register('country')}
      />
    </div>
  );
}
