// ListingCreateDialog: "Add listing" (`POST /admin/service-listings`): puts a service on the storefront. The demo
// listed every IMEI service from its seed and had no such button; the map adds the create route. The Service field searches the
// services feature's list on the server (`GET /admin/services?q=`, needs `catalog:read`); the server refuses a service that can
// never be public.
import { useController, useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, TextField } from '@/components/ui';
import type { Service } from '@/features/services';
import { useCreateListing } from '../hooks/useListingMutations';
import { ServiceSearchField } from './ServiceSearchField';

type Values = { service: Service | null; publicTitle: string; slug: string };

/** The form and its request. */
export function ListingCreateDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateListing();
  const form = useForm<Values>({ defaultValues: { service: null, publicTitle: '', slug: '' } });
  const {
    control,
    register,
    setValue,
    // Read here so the form keeps them current: `choose` must know whether the title was typed by hand.
    formState: { errors, dirtyFields },
  } = form;
  const service = useController({
    control,
    name: 'service',
    rules: { validate: (value) => value !== null || 'Choose a service.' },
  });

  const submit = dialogSubmit(
    form,
    async (values) => {
      if (!values.service) return false;
      const slug = values.slug.trim();
      await create.mutateAsync({
        serviceId: values.service.id,
        publicTitle: values.publicTitle.trim(),
        ...(slug ? { slug } : {}),
      });
    },
    // The server names the field `serviceId` ("This service already has a listing."); the form keeps the whole service.
    { fields: ['service', 'publicTitle', 'slug'], aliases: { serviceId: 'service' } },
  );

  // Choosing a service suggests its name as the public title, until the admin types a title of their own.
  const choose = (next: Service | null) => {
    service.field.onChange(next);
    if (next && !dirtyFields.publicTitle) setValue('publicTitle', next.name);
  };

  return (
    <FormDialog
      open
      title="Add listing"
      sub="Put a service on the public site. Set its price and switch it on afterwards."
      confirm="Add listing"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <ServiceSearchField
          ref={service.field.ref}
          value={service.field.value}
          onChange={choose}
          onBlur={service.field.onBlur}
          error={service.fieldState.error}
        />
        <TextField
          label="Slug"
          className="mono"
          autoComplete="off"
          spellCheck={false}
          hint="Leave empty and the server makes it from the title."
          error={errors.slug}
          {...register('slug')}
        />
        <TextField
          label="Public title"
          autoComplete="off"
          maxLength={120}
          error={errors.publicTitle}
          {...register('publicTitle', {
            validate: (value) => value.trim() !== '' || 'Enter the title customers see.',
          })}
        />
      </div>
    </FormDialog>
  );
}
