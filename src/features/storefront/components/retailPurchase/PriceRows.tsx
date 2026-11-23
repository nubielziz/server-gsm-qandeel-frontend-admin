// PriceRows: the rows of the shop price form as label-left rows: "Follow the pricing rule" as a Yes | No switch, the typed price with the
// server's floor when it is No, and the B2B base price and the supplier cost read-only. Every figure is the server's. The same values and
// rules as the Storefront price dialog's body (shop/priceForm.ts); only the drawing differs.
import { useId } from 'react';
import { useController, type UseFormReturn } from 'react-hook-form';
import { FormRow, TextField, YesNo, ReadValue } from '@/components/ui';
import { money } from '@/lib/format';
import type { ServiceListing } from '../../types';
import { priceProblem, ruleHint, type PriceFormValues } from '../shop/priceForm';

export interface PriceRowsProps {
  form: UseFormReturn<PriceFormValues>;
  listing: ServiceListing;
}

/** The choice, the typed price or the price now, and the two read-only figures. */
export function PriceRows({ form, listing }: PriceRowsProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const { field: mode } = useController({ name: 'mode', control });
  const id = useId();
  const follows = mode.value === 'rule';
  return (
    <>
      <FormRow
        label="Follow the pricing rule"
        htmlFor={id}
        hint={follows ? ruleHint(listing) : 'A typed price stays until you change it.'}
        error={errors.mode?.message}
      >
        <YesNo id={id} value={follows} onChange={(next) => mode.onChange(next ? 'rule' : 'type')} />
      </FormRow>
      {follows ? (
        <FormRow label="Shop price now">
          <ReadValue>{listing.retailPrice ? money(listing.retailPrice) : 'None'}</ReadValue>
        </FormRow>
      ) : (
        <TextField
          label="Shop price (USD)"
          layout="row"
          className="mono"
          inputMode="decimal"
          autoComplete="off"
          hint={`Before VAT. Floor ${money(listing.floorPrice)}: the lowest price the server accepts. Customers see this price in their own currency with VAT added.`}
          error={errors.retailPrice}
          {...register('retailPrice', { validate: (_value, values) => priceProblem(values) })}
        />
      )}
      <FormRow label="B2B base price">
        <ReadValue>{money(listing.service.basePrice)}</ReadValue>
      </FormRow>
      <FormRow label="Supplier cost">
        <ReadValue>{money(listing.service.cost)}</ReadValue>
      </FormRow>
    </>
  );
}
