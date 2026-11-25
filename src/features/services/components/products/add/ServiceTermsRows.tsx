// ServiceTermsRows: the rows of the +Add Service form after the group: Status, Send For Verification (and its window in hours), User Can Cancel Order,
// Delivery Time with its unit, Credit, Your cost, Delivered from code stock and Order handling. The two-part switches are the kit's YesNo.
import { useId } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { cx, FormRow, SelectField, YesNo } from '@/components/ui';
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import {
  creditProblem,
  deliveryProblem,
  ownCostProblem,
  windowProblem,
  type AddServiceValues,
} from './addServiceForm';
import { fieldWiring, INVALID_BORDER } from './fieldWiring';
import { DELIVERY_UNITS } from '../../../lib/delivery';

export interface ServiceTermsRowsProps {
  form: UseFormReturn<AddServiceValues>;
  grants: ServiceGrants;
}

const UNIT_NOTE = 'text-sm italic text-ink3';

/**
 * Status and Order handling are set by the update that follows the create, so they need `catalog:update` as well; without it they are
 * locked, with the missing permission named. The credit is the service's base price, the one price the create route takes.
 */
export function ServiceTermsRows({ form, grants }: ServiceTermsRowsProps) {
  const base = useId();
  const { register, setValue, watch } = form;
  const { errors } = form.formState;
  const verify = watch('verify');
  const switchLock = grants.needs('catalog:update');
  const ids = {
    status: `${base}-status`,
    verify: `${base}-verify`,
    window: `${base}-window`,
    cancel: `${base}-cancel`,
    delivery: `${base}-delivery`,
    credit: `${base}-credit`,
    ownCost: `${base}-own-cost`,
    stock: `${base}-stock`,
    handling: `${base}-handling`,
  };
  const flip = (field: 'active' | 'automatic' | 'verify' | 'cancel' | 'stockDelivery') => (next: boolean) =>
    setValue(field, next, { shouldDirty: true });

  return (
    <>
      <FormRow label="Status" htmlFor={ids.status} error={errors.active?.message}>
        <YesNo
          id={ids.status}
          yes="Active"
          no="Inactive"
          value={watch('active')}
          onChange={flip('active')}
          {...switchLock}
        />
      </FormRow>
      <FormRow label="Send For Verification" htmlFor={ids.verify} error={errors.verify?.message}>
        <YesNo id={ids.verify} value={verify} onChange={flip('verify')} />
      </FormRow>
      {verify && (
        <FormRow
          label="Verification window"
          htmlFor={ids.window}
          hint="How long after an order completes a merchant may ask for its verification."
          error={errors.verifyWindowH?.message}
        >
          <div className="flex items-center gap-2">
            <input
              id={ids.window}
              className={cx('input w-24', INVALID_BORDER)}
              inputMode="numeric"
              autoComplete="off"
              {...fieldWiring(ids.window, { hint: true, error: Boolean(errors.verifyWindowH) })}
              {...register('verifyWindowH', { validate: (_value, values) => windowProblem(values) })}
            />
            <span className={UNIT_NOTE}>hours</span>
          </div>
        </FormRow>
      )}
      <FormRow label="User Can Cancel Order" htmlFor={ids.cancel} error={errors.cancel?.message}>
        <YesNo id={ids.cancel} value={watch('cancel')} onChange={flip('cancel')} />
      </FormRow>
      <FormRow
        label="Delivery Time"
        htmlFor={ids.delivery}
        error={errors.deliveryAmount?.message ?? errors.deliveryUnit?.message}
      >
        <div className="flex items-center gap-2">
          <input
            id={ids.delivery}
            className={cx('input w-24', INVALID_BORDER)}
            inputMode="numeric"
            autoComplete="off"
            aria-required="true"
            {...fieldWiring(ids.delivery, { error: Boolean(errors.deliveryAmount) })}
            {...register('deliveryAmount', { validate: (_value, values) => deliveryProblem(values) })}
          />
          <SelectField
            aria-label="Delivery time unit"
            options={DELIVERY_UNITS}
            {...register('deliveryUnit')}
          />
        </div>
      </FormRow>
      <FormRow
        label="Credit"
        htmlFor={ids.credit}
        hint="The base price of one order. Rank prices are set in Pricing."
        error={errors.credit?.message}
      >
        <div className="flex items-center gap-2">
          <input
            id={ids.credit}
            className={cx('input w-28', INVALID_BORDER)}
            inputMode="decimal"
            autoComplete="off"
            aria-required="true"
            {...fieldWiring(ids.credit, { hint: true, error: Boolean(errors.credit) })}
            {...register('credit', { validate: creditProblem })}
          />
          <span className={UNIT_NOTE}>USD</span>
        </div>
      </FormRow>
      <FormRow
        label="Your cost"
        htmlFor={ids.ownCost}
        hint="What one unit costs you. The cost used is the larger of this and the supplier's."
        error={errors.ownCost?.message}
      >
        <div className="flex items-center gap-2">
          <input
            id={ids.ownCost}
            className={cx('input w-28', INVALID_BORDER)}
            inputMode="decimal"
            autoComplete="off"
            {...fieldWiring(ids.ownCost, { hint: true, error: Boolean(errors.ownCost) })}
            {...register('ownCost', { validate: ownCostProblem })}
          />
          <span className={UNIT_NOTE}>USD</span>
        </div>
      </FormRow>
      <FormRow
        label="Delivered from code stock"
        htmlFor={ids.stock}
        hint="Orders take a code from this service's stock first. For gift cards and other codes; leave No for unlocks."
        error={errors.stockDelivery?.message}
      >
        <YesNo id={ids.stock} value={watch('stockDelivery')} onChange={flip('stockDelivery')} />
      </FormRow>
      <FormRow label="Order handling" htmlFor={ids.handling} error={errors.automatic?.message}>
        <YesNo
          id={ids.handling}
          yes="Automatic"
          no="Manual"
          value={watch('automatic')}
          onChange={flip('automatic')}
          {...switchLock}
        />
      </FormRow>
    </>
  );
}
