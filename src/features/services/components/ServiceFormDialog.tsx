// ServiceFormDialog: "New service" and "Edit service" (`POST` and `PATCH /admin/services`). The demo had neither (its empty state only
// offered "Import from supplier"); the map has both. A name, a code, a category, a type and the SLA; a new service also gets its
// first price. Supplier links belong to the Suppliers page, so an edit shows the linked suppliers read-only with a link there.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, SelectField, TextField, toast } from '@/components/ui';
import { useCategories } from '../hooks/useChoices';
import { useCreateService, useUpdateService } from '../hooks/useServiceMutations';
import { isMoneyText, toMoneyText } from '../lib/money';
import { withChosen } from '../lib/select';
import { TYPE_OPTIONS } from '../lib/status';
import type { CreateServiceBody, Service, ServiceType, UpdateServiceBody } from '../types';
import { LinkedSuppliers } from './LinkedSuppliers';
import { LookupNote } from './LookupNote';

type Values = {
  name: string;
  code: string;
  categoryId: string;
  type: ServiceType;
  slaMinutes: string;
  basePrice: string;
};

export interface ServiceFormDialogProps {
  /** The service to edit; leave out to create one. */
  service?: Service;
  onClose: () => void;
}

/** Creates a service, or edits the one it is given. */
export function ServiceFormDialog({ service, onClose }: ServiceFormDialogProps) {
  const categories = useCategories();
  const create = useCreateService();
  const update = useUpdateService();
  const form = useForm<Values>({
    defaultValues: {
      name: service?.name ?? '',
      code: service?.code ?? '',
      categoryId: service ? String(service.categoryId) : '',
      type: service?.type ?? 'imei',
      slaMinutes: String(service?.slaMinutes ?? 60),
      basePrice: '',
    },
  });
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const next = {
        name: values.name.trim(),
        code: values.code.trim(),
        categoryId: Number(values.categoryId),
        type: values.type,
        slaMinutes: Number(values.slaMinutes),
      };
      if (!service) {
        const body: CreateServiceBody = { ...next, basePrice: toMoneyText(values.basePrice) };
        await create.mutateAsync(body);
        return;
      }
      // Only what changed is sent.
      const body: UpdateServiceBody = {};
      if (next.name !== service.name) body.name = next.name;
      if (next.code !== service.code) body.code = next.code;
      if (next.categoryId !== service.categoryId) body.categoryId = next.categoryId;
      if (next.type !== service.type) body.type = next.type;
      if (next.slaMinutes !== service.slaMinutes) body.slaMinutes = next.slaMinutes;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ service, body });
    },
    // Every name here has an error line under its input; the price input exists only when creating.
    {
      fields: ['name', 'code', 'categoryId', 'type', 'slaMinutes', ...(service ? [] : ['basePrice'])],
    },
  );

  // The select is controlled, so the service's own category stays chosen while the category names are still loading.
  const categoryOptions = withChosen(
    [
      { value: '', label: categories.query.isLoading ? 'Loading…' : 'Choose a category' },
      ...categories.categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    watch('categoryId'),
    service?.category?.name ?? `Category ${watch('categoryId')}`,
  );

  return (
    <FormDialog
      open
      title={service ? 'Edit service' : 'New service'}
      sub={service ? service.name : 'Add the service to the catalog, then link it to a supplier.'}
      confirm={service ? 'Save changes' : 'Create service'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="Name"
          autoComplete="off"
          maxLength={120}
          autoFocus
          error={errors.name}
          {...register('name', { validate: (value) => value.trim() !== '' || 'Enter a name.' })}
        />
        <TextField
          label="Code"
          className="mono"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          hint="A short unique code, such as IMEI-ATT-USA."
          error={errors.code}
          {...register('code', { validate: (value) => value.trim() !== '' || 'Enter a code.' })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Category"
            selectWrapClassName="w-full"
            options={categoryOptions}
            error={errors.categoryId}
            {...register('categoryId', { validate: (value) => /^\d+$/.test(value) || 'Choose a category.' })}
            value={watch('categoryId')}
          />
          <SelectField
            label="Type"
            selectWrapClassName="w-full"
            options={TYPE_OPTIONS}
            error={errors.type}
            {...register('type')}
          />
        </div>
        <LookupNote what="the categories" query={categories.query} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="SLA (minutes)"
            inputMode="numeric"
            autoComplete="off"
            hint="The target time to deliver an order."
            error={errors.slaMinutes}
            {...register('slaMinutes', {
              validate: (value) =>
                (/^\d+$/.test(value.trim()) && Number(value) >= 1) || 'Enter minutes, 1 or more.',
            })}
          />
          {!service && (
            <TextField
              label="Base price (USD)"
              inputMode="decimal"
              autoComplete="off"
              error={errors.basePrice}
              {...register('basePrice', {
                validate: (value) =>
                  (isMoneyText(value) && Number(value) > 0) || 'Enter a price greater than zero.',
              })}
            />
          )}
        </div>
        {service && <LinkedSuppliers service={service} />}
      </div>
    </FormDialog>
  );
}
