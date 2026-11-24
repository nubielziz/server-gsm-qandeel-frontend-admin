// PriceDialog: add or edit a fixed price of one account: the service, the price and an optional note. The price beats the rank
// price, the category rule and every discount. The server refuses a price below the service's floor (cost plus minimum profit) and says why
// under the price; it also refuses a second price for the same service. Editing sends only what changed.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, SelectField, TextField, toast } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { money } from '@/lib/format';
import { useCreatePrice, useServiceOptions, useUpdatePrice } from '../../hooks/useAccountPrices';
import type { AccountPrice, AccountRow, UpdateAccountPriceBody } from '../../types';
import { accountLabel } from '../shared/accountLabel';
import { cleanNote, NOTE_MAX, parsePrice, priceInput, samePrice } from './priceInput';

type Values = { serviceId: string; price: string; note: string };

export interface PriceDialogProps {
  account: Pick<AccountRow, 'id' | 'name' | 'email' | 'status'>;
  /** The fixed price to edit; leave out to add one. */
  price?: AccountPrice;
  /** The account's fixed prices, so a service that has one is not offered again. */
  existing: readonly AccountPrice[];
  /** Whether the staff member may list the services. Without it the menu says so instead of staying empty. */
  canListServices: boolean;
  onClose: () => void;
}

const NEEDS_CATALOG = 'You need the catalog:read permission to list the services';

/** Adds a fixed price or edits one. The server checks the floor, so its message shows under the price. Mounted only while open. */
export function PriceDialog({ account, price, existing, canListServices, onClose }: PriceDialogProps) {
  const services = useServiceOptions(!price && canListServices);
  const create = useCreatePrice();
  const update = useUpdatePrice();
  const name = accountLabel(account);
  const form = useForm<Values>({
    defaultValues: {
      serviceId: price ? String(price.serviceId) : '',
      price: price ? priceInput(price.price) : '',
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

  // Why the menu has nothing to pick, in words: a missing permission, a failed read, or every service already has a fixed price.
  const menuHint = !canListServices
    ? NEEDS_CATALOG
    : services.isError
      ? isApiError(services.error) && services.error.status === 403
        ? NEEDS_CATALOG
        : 'Could not load the services. Try again in a moment.'
      : services.isSuccess && choices.length === 0
        ? 'Every active service already has a fixed price for this account.'
        : undefined;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const amount = parsePrice(values.price);
      if (!amount) return 'Enter a price greater than zero.';
      const note = cleanNote(values.note);
      if (!price) {
        const service = choices.find((candidate) => String(candidate.id) === values.serviceId);
        if (!service) return 'Choose a service.';
        await create.mutateAsync({
          body: { clientId: account.id, serviceId: service.id, price: amount, ...(note ? { note } : {}) },
          serviceName: service.name,
          accountName: name,
        });
        return;
      }
      const body: UpdateAccountPriceBody = {};
      if (!samePrice(amount, price.price)) body.price = amount;
      if (note !== price.note) body.note = note;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ price, body, accountName: name });
    },
    { fields: ['serviceId', 'price', 'note'] },
  );

  return (
    <FormDialog
      open
      title={price ? `Fixed price for ${price.service.name}` : 'Add a fixed price'}
      sub={`${name}. This fixed price beats the rank price, the category rule and every discount.`}
      confirm="Save fixed price"
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
            validate: (value) => parsePrice(value) !== null || 'Enter a price greater than zero.',
          })}
        />
        <TextField
          label="Note (optional)"
          maxLength={NOTE_MAX}
          autoComplete="off"
          error={errors.note}
          {...register('note')}
        />
      </div>
    </FormDialog>
  );
}
