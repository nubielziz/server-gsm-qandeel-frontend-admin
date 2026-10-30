// PriceDialog: add or edit a client override (the demo's `m-override` action): the service, the fixed price and an optional note.
// The override beats the group price, the category rule and every discount. The server refuses a price below the service's
// floor (cost plus minimum profit) and the message shows under the price.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextField, dialogSubmit, toast } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { money } from '@/lib/format';
import { useCreatePrice, useServiceOptions, useUpdatePrice } from '../hooks/useClientPrices';
import { amountInput, parseAmount } from '../lib/amount';
import { cleanText } from '../lib/input';
import type { Client, ClientPrice, UpdateClientPriceBody } from '../types';

type Values = { serviceId: string; price: string; note: string };

export interface PriceDialogProps {
  client: Pick<Client, 'id' | 'name'>;
  /** The override to edit; leave out to add one. */
  price?: ClientPrice;
  /** The merchant's current overrides, so a service that has one is not offered again. */
  existing: readonly ClientPrice[];
  /** Whether the staff member may list the services. Without it the menu says so instead of staying empty. */
  canListServices: boolean;
  onClose: () => void;
}

/** Adds an override or edits one. The server checks the floor, so its message shows under the price. */
export function PriceDialog({ client, price, existing, canListServices, onClose }: PriceDialogProps) {
  const services = useServiceOptions(!price && canListServices);
  const create = useCreatePrice();
  const update = useUpdatePrice();
  const form = useForm<Values>({
    defaultValues: {
      serviceId: price ? String(price.serviceId) : '',
      price: price ? amountInput(price.price) : '',
      note: price?.note ?? '',
    },
  });
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const taken = new Set(existing.map((row) => row.serviceId));
  const choices = (services.data ?? []).filter((service) => !taken.has(service.id));
  const chosen = choices.find((service) => String(service.id) === watch('serviceId'));
  const floor = price?.service.floorPrice ?? chosen?.floorPrice;

  // Why the menu has nothing to pick, in words: a missing permission, a failed read, or every service already has an override.
  const menuHint = !canListServices
    ? 'Listing the services needs the catalog:read permission.'
    : services.isError
      ? isApiError(services.error) && services.error.status === 403
        ? 'Listing the services needs the catalog:read permission.'
        : 'Could not load the services. Try again in a moment.'
      : services.isSuccess && choices.length === 0
        ? 'Every active service already has an override for this merchant.'
        : undefined;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const amount = parseAmount(values.price);
      if (!amount) return 'Enter a price greater than zero.';
      const note = cleanText(values.note);
      if (!price) {
        const service = choices.find((candidate) => String(candidate.id) === values.serviceId);
        if (!service) return 'Choose a service.';
        await create.mutateAsync({
          body: { clientId: client.id, serviceId: service.id, price: amount, ...(note ? { note } : {}) },
          serviceName: service.name,
          clientName: client.name,
        });
        return;
      }
      const body: UpdateClientPriceBody = {};
      if (Number(amount) !== Number(price.price)) body.price = amount;
      if (note !== price.note) body.note = note;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ price, body, clientName: client.name });
    },
    { fields: ['serviceId', 'price', 'note'] },
  );

  return (
    <FormDialog
      open
      title={price ? 'Edit client override' : 'Add client override'}
      sub={`${client.name}. This fixed price beats the group price, category rule and discount.`}
      confirm="Save override"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        {price ? (
          <p className="text-sm">
            <span className="text-ink3">Service </span>
            <span className="font-medium">{price.service.name}</span>
          </p>
        ) : (
          <SelectField
            label="Service"
            selectWrapClassName="w-full"
            disabled={choices.length === 0}
            hint={menuHint}
            options={[
              { value: '', label: services.isLoading ? 'Loading services…' : 'Choose a service' },
              ...choices.map((service) => ({
                value: service.id,
                label: service.floorPrice
                  ? `${service.name} (floor ${money(service.floorPrice)})`
                  : service.name,
              })),
            ]}
            error={errors.serviceId}
            {...register('serviceId', { required: 'Choose a service.' })}
          />
        )}
        <TextField
          label="Price (USD)"
          inputMode="decimal"
          placeholder="0.00"
          autoComplete="off"
          hint={
            floor
              ? `Must be at or above ${money(floor)}, the floor (cost plus minimum profit).`
              : 'Must be at or above cost plus minimum profit.'
          }
          error={errors.price}
          {...register('price', {
            validate: (value) => parseAmount(value) !== null || 'Enter a price greater than zero.',
          })}
        />
        <TextField
          label="Note (optional)"
          maxLength={140}
          autoComplete="off"
          error={errors.note}
          {...register('note')}
        />
      </div>
    </FormDialog>
  );
}
