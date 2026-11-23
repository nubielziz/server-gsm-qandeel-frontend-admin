// PriceFormBody: the fields of the shop price form (follow the rule, or type a price, and the figures beside it). Shared by the
// Storefront price dialog and the Catalog panel's price block; each makes its own form and its own save.
import type { UseFormReturn } from 'react-hook-form';
import { KeyValue, RadioGroup, TextField } from '@/components/ui';
import { money } from '@/lib/format';
import type { ServiceListing } from '../../types';
import { priceProblem, ruleHint, type PriceFormValues } from './priceForm';

export interface PriceFormBodyProps {
  form: UseFormReturn<PriceFormValues>;
  listing: ServiceListing;
  /** Puts the cursor in the price when it shows. On in the dialog, off in the panel (it would pull the page). */
  autoFocus?: boolean;
}

/** The choice, the typed price with the server's floor, and the B2B base price and supplier cost. All figures are the server's. */
export function PriceFormBody({ form, listing, autoFocus = true }: PriceFormBodyProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const mode = watch('mode');
  return (
    <div className="space-y-3">
      <RadioGroup
        legend="How the price is set"
        options={[
          { value: 'rule', label: 'Follow the pricing rule', description: ruleHint(listing) },
          { value: 'type', label: 'Type a price', description: 'A typed price stays until you change it.' },
        ]}
        error={errors.mode}
        {...register('mode')}
      />
      {mode === 'type' && (
        <TextField
          label="Price shown to customers (USD, before VAT)"
          className="mono"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          hint={`Floor ${money(listing.floorPrice)}: the lowest price the server accepts. Customers see this price in their own currency with VAT added.`}
          error={errors.retailPrice}
          {...register('retailPrice', { validate: (_value, values) => priceProblem(values) })}
        />
      )}
      <KeyValue
        rows={[
          ['B2B base price', money(listing.service.basePrice)],
          ['Supplier cost', money(listing.service.cost)],
        ]}
      />
    </div>
  );
}
