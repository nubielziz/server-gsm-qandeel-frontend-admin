// ListingCreateDialog: "Add listing" (`POST /admin/service-listings`): puts a service on the storefront in one language. The demo
// listed every IMEI service from its seed and had no such button; the map adds the create route. The service menu comes from the
// services feature (`GET /admin/services`, needs `catalog:read`); the server refuses a service that can never be public.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, SelectField, TextField } from '@/components/ui';
import { useServiceChoices } from '../hooks/useServiceChoices';
import { useCreateListing } from '../hooks/useListingMutations';
import { LOCALE_OPTIONS } from '../lib/kinds';

type Values = { serviceId: string; locale: string; publicTitle: string; slug: string };

/** The form and its request. */
export function ListingCreateDialog({ onClose }: { onClose: () => void }) {
  const services = useServiceChoices();
  const create = useCreateListing();
  const form = useForm<Values>({ defaultValues: { serviceId: '', locale: 'en', publicTitle: '', slug: '' } });
  const {
    register,
    setValue,
    getFieldState,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const slug = values.slug.trim();
      await create.mutateAsync({
        serviceId: Number(values.serviceId),
        locale: values.locale,
        publicTitle: values.publicTitle.trim(),
        ...(slug ? { slug } : {}),
      });
    },
    { fields: ['serviceId', 'locale', 'publicTitle', 'slug'] },
  );

  // Choosing a service suggests its name as the public title, until the admin types a title of their own.
  const { onChange: onServiceChange, ...serviceField } = register('serviceId', {
    validate: (value) => value !== '' || 'Choose a service.',
  });
  const chosen = (event: Parameters<typeof onServiceChange>[0]) => {
    void onServiceChange(event);
    const name = services.data?.find((service) => String(service.id) === event.target.value)?.name;
    if (name && !getFieldState('publicTitle', form.formState).isDirty) setValue('publicTitle', name);
  };

  const options = [
    { value: '', label: services.isLoading ? 'Loading services…' : 'Choose a service' },
    ...(services.data ?? []).map((service) => ({
      value: String(service.id),
      label: `${service.name} (${service.code})`,
    })),
  ];

  return (
    <FormDialog
      open
      title="Add listing"
      sub="Put a service on the public site in one language. Set its price and switch it on afterwards."
      confirm="Add listing"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <SelectField
          label="Service"
          selectWrapClassName="w-full"
          options={options}
          hint={
            services.isError
              ? 'The services could not be loaded. Close the dialog and try again.'
              : 'Only active IMEI services are sold to the public.'
          }
          error={errors.serviceId}
          {...serviceField}
          onChange={chosen}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Language"
            selectWrapClassName="w-full"
            options={LOCALE_OPTIONS}
            error={errors.locale}
            {...register('locale')}
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
        </div>
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
