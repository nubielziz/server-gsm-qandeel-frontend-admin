// GatewayFields: the inputs of the payment method dialog (name, code, fees, limits, switches, instructions); the write-only secrets
// are in GatewaySecretFields. The dialog owns the form; this file only lays the fields out.
import type { UseFormReturn } from 'react-hook-form';
import { CheckboxField, SelectField, TextareaField, TextField, type SelectOption } from '@/components/ui';
import { isDecimalText } from '../lib/decimal';
import type { GatewayAudience, PaymentGateway } from '../types';
import { GatewaySecretFields } from './GatewaySecretFields';

/** What the dialog's form holds; numbers stay text until they are sent. */
export type GatewayValues = {
  name: string;
  code: string;
  driver: string;
  audience: GatewayAudience;
  feePercent: string;
  feeFixed: string;
  minAmount: string;
  maxAmount: string;
  holdHours: string;
  supportsRefunds: boolean;
  supports3ds: boolean;
  isManual: boolean;
  isActive: boolean;
  instructions: string;
  secret: string;
  /** The key the gateway signs its webhooks with (write-only; empty = keep the stored one). */
  webhookSecret: string;
  /** The second signing key (write-only; empty = keep the stored one). */
  secondaryWebhookSecret: string;
  /** The "Remove" control was used: the stored second key goes when the form is saved. */
  secondaryRemoved: boolean;
};

const AUDIENCES: readonly SelectOption[] = [
  { value: 'b2c', label: 'Storefront customers (B2C)' },
  { value: 'b2b', label: 'API merchants (B2B)' },
  { value: 'both', label: 'Both' },
];

/** What a method made from a ready-made one says under its driver and its manual setting: the server keeps both as the entry has them. */
const FIXED_HINT = 'Set by the ready-made method; it cannot change.';

const required = (message: string) => (value: string) => value.trim() !== '' || message;
const amount = (value: string) => isDecimalText(value) || 'Enter an amount, such as 0.30.';

/**
 * The fields. `gateway` is set when editing: the code is then fixed and the secret fields say which are stored. `presetMade` is true for a
 * method made from a ready-made one (an edit of one, or the add dialog opened from the gallery): its driver and its manual setting are
 * fixed (read-only; `aria-disabled` and the click stopped, because react-hook-form drops the value of a disabled field), as the server
 * refuses a change of either (422 `driver` and `isManual`). A custom method keeps both free.
 */
export function GatewayFields({
  form,
  gateway,
  presetMade = false,
}: {
  form: UseFormReturn<GatewayValues>;
  gateway?: PaymentGateway;
  presetMade?: boolean;
}) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Name"
          autoComplete="off"
          autoFocus
          error={errors.name}
          {...register('name', { validate: required('Enter a name.') })}
        />
        <TextField
          label="Code"
          autoComplete="off"
          readOnly={gateway !== undefined}
          hint={
            gateway
              ? 'Part of the payment webhook address, so it cannot change.'
              : 'Letters and numbers, such as card.'
          }
          error={errors.code}
          {...register('code', { validate: required('Enter a code.') })}
        />
        <TextField
          label="Driver"
          autoComplete="off"
          readOnly={presetMade}
          hint={presetMade ? FIXED_HINT : 'The integration that talks to the gateway.'}
          error={errors.driver}
          {...register('driver', { validate: required('Enter the driver.') })}
        />
        <SelectField
          label="Who can pay"
          selectWrapClassName="w-full"
          options={AUDIENCES}
          error={errors.audience}
          {...register('audience')}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="Fee (%)"
          inputMode="decimal"
          autoComplete="off"
          error={errors.feePercent}
          {...register('feePercent', { validate: amount })}
        />
        <TextField
          label="Fixed fee ($)"
          inputMode="decimal"
          autoComplete="off"
          error={errors.feeFixed}
          {...register('feeFixed', { validate: amount })}
        />
        <TextField
          label="Hold (hours)"
          inputMode="numeric"
          autoComplete="off"
          hint="Manual review time."
          error={errors.holdHours}
          {...register('holdHours', { validate: (v) => /^\d+$/.test(v.trim()) || 'Enter a whole number.' })}
        />
        <TextField
          label="Smallest payment ($)"
          inputMode="decimal"
          autoComplete="off"
          hint="0 means no minimum."
          error={errors.minAmount}
          {...register('minAmount', { validate: amount })}
        />
        <TextField
          label="Largest payment ($)"
          inputMode="decimal"
          autoComplete="off"
          hint="0 means no maximum."
          error={errors.maxAmount}
          {...register('maxAmount', { validate: amount })}
        />
      </div>
      <TextareaField
        label="Instructions"
        rows={2}
        hint="Shown with the payment method; a manual method says how to pay."
        error={errors.instructions}
        {...register('instructions')}
      />
      <GatewaySecretFields form={form} gateway={gateway} />
      <div className="grid gap-2 sm:grid-cols-2">
        <CheckboxField
          label="Refunds go back automatically"
          error={errors.supportsRefunds}
          {...register('supportsRefunds')}
        />
        <CheckboxField label="Uses 3D Secure" error={errors.supports3ds} {...register('supports3ds')} />
        <CheckboxField
          label="A person checks each payment (manual)"
          hint={presetMade ? FIXED_HINT : undefined}
          aria-disabled={presetMade || undefined}
          className={presetMade ? 'aria-disabled:opacity-60' : undefined}
          // A click (a mouse press, a label click or the space key all end in one) is stopped, so the box keeps its value.
          onClick={presetMade ? (event) => event.preventDefault() : undefined}
          error={errors.isManual}
          {...register('isManual')}
        />
        <CheckboxField
          label="On (customers can pay with it)"
          error={errors.isActive}
          {...register('isActive')}
        />
      </div>
    </div>
  );
}
