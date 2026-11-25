// OverviewFields: the rows of the Overview part, label on the left and control on the right (the layout the owner asked for), in the order of the
// +Add Service form: Service Name, Code, Service Listed In Group, Status, Send For Verification (its window in hours is a row of its own,
// shown when Yes), User Can Cancel Order, Delivery Time, Order handling and Delivered from code stock. It owns no request: the group names are read here and the save
// belongs to the part.
import type { UseFormReturn } from 'react-hook-form';
import { FormRow, SectionHeading, SelectField, TextField } from '@/components/ui';
import { LookupNote } from '../../../LookupNote';
import { useCategories } from '../../../../hooks/useChoices';
import { deliveryProblem, DELIVERY_UNITS } from '../../../../lib/delivery';
import { windowProblem, type OverviewValues } from './overviewForm';
import { SwitchRow } from './SwitchRow';
import { withChosen } from '../../../../lib/select';
import type { Service } from '../../../../types';

export interface OverviewFieldsProps {
  form: UseFormReturn<OverviewValues>;
  service: Service;
  /** A missing permission: every control is off, and the part says why. */
  lock: { disabled: boolean; title?: string };
}

// The ids of the two boxes that sit in a row of their own: the kit's FormRow gives its hint and error `<id>-hint` and `<id>-error`.
const WINDOW_ID = 'overview-window';
const DELIVERY_ID = 'overview-delivery';

// The ids a box points at with aria-describedby: its hint always, its error while it shows one.
const describedBy = (id: string, failed: boolean) => (failed ? `${id}-hint ${id}-error` : `${id}-hint`);

/** The inputs of the Overview part with the checks that run before the server is called. */
export function OverviewFields({ form, service, lock }: OverviewFieldsProps) {
  const categories = useCategories();
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const chosen = watch('categoryId');
  const verify = watch('verify');

  // Only the groups of the service's own kind: the server refuses a group of another kind. The service's own group stays chosen while the
  // names are loading.
  const groups = withChosen(
    [
      { value: '', label: categories.query.isLoading ? 'Loading…' : 'Choose a group' },
      ...categories.categories
        .filter((category) => category.type === service.type)
        .map((category) => ({ value: category.id, label: category.name })),
    ],
    chosen,
    String(chosen) === String(service.categoryId) && service.category
      ? service.category.name
      : `Group ${chosen}`,
  );

  return (
    <fieldset disabled={lock.disabled} className="min-w-0">
      <SectionHeading as="h3">Overview</SectionHeading>
      <TextField
        layout="row"
        label="Service Name"
        required
        autoComplete="off"
        maxLength={120}
        error={errors.name}
        {...register('name', { validate: (value) => value.trim() !== '' || 'Enter a name.' })}
      />
      <TextField
        layout="row"
        label="Code"
        required
        className="mono"
        autoComplete="off"
        spellCheck={false}
        maxLength={40}
        hint="A short unique code, such as IMEI-ATT-USA."
        error={errors.code}
        {...register('code', { validate: (value) => value.trim() !== '' || 'Enter a code.' })}
      />
      <div>
        <SelectField
          layout="row"
          label="Service Listed In Group"
          selectWrapClassName="w-full max-w-md"
          options={groups}
          error={errors.categoryId}
          {...register('categoryId', { validate: (value) => /^\d+$/.test(value) || 'Choose a group.' })}
          value={chosen}
        />
        <LookupNote what="the groups" query={categories.query} />
      </div>
      <SwitchRow
        form={form}
        name="active"
        label="Status"
        yes="Active"
        no="Inactive"
        hint="Merchants can order an active service. An inactive one is hidden from them, and its open orders continue."
        lock={lock}
      />
      <SwitchRow form={form} name="verify" label="Send For Verification" lock={lock} />
      {verify && (
        <FormRow
          label="Verification window"
          htmlFor={WINDOW_ID}
          hint="How long after an order completes a merchant may ask for its verification. 0 means no window."
          error={errors.verifyWindowH?.message}
        >
          <div className="flex items-center gap-2">
            <input
              id={WINDOW_ID}
              className="input w-24 aria-[invalid=true]:border-crit-dot"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={errors.verifyWindowH ? true : undefined}
              aria-describedby={describedBy(WINDOW_ID, Boolean(errors.verifyWindowH))}
              {...register('verifyWindowH', {
                validate: (_value, values) => windowProblem(values),
              })}
            />
            <span className="text-sm italic text-ink3">hours</span>
          </div>
        </FormRow>
      )}
      <SwitchRow
        form={form}
        name="cancel"
        label="User Can Cancel Order"
        hint="A merchant may cancel an order that was never sent."
        lock={lock}
      />
      <FormRow
        label="Delivery Time"
        htmlFor={DELIVERY_ID}
        hint="The target time to deliver an order."
        error={errors.delivery?.message}
      >
        <div className="flex items-center gap-2">
          <input
            id={DELIVERY_ID}
            className="input w-24 aria-[invalid=true]:border-crit-dot"
            inputMode="numeric"
            autoComplete="off"
            aria-required="true"
            aria-invalid={errors.delivery ? true : undefined}
            aria-describedby={describedBy(DELIVERY_ID, Boolean(errors.delivery))}
            {...register('delivery', {
              validate: (value, values) => deliveryProblem(value, values.unit),
            })}
          />
          <SelectField
            aria-label="Delivery time unit"
            selectWrapClassName="w-32"
            options={DELIVERY_UNITS}
            {...register('unit')}
          />
        </div>
      </FormRow>
      <SwitchRow
        form={form}
        name="auto"
        label="Order handling"
        yes="Automatic"
        no="Manual"
        hint="Automatic sends new orders to the supplier at once. Manual makes them wait for an operator."
        lock={lock}
      />
      <SwitchRow
        form={form}
        name="stockDelivery"
        label="Delivered from code stock"
        hint="Orders take a code from this service's stock first. For gift cards and other codes; leave No for unlocks."
        lock={lock}
      />
    </fieldset>
  );
}
