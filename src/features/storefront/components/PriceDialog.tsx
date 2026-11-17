// PriceDialog: "Storefront price" for one listing (`PATCH /admin/service-listings/:id`). Ports `sf-price` of 50-p-storefront.js. The
// demo worked out margin and gateway fee while typing and refused a price under the floor itself; the console does no pricing maths
// (MISMATCHES M92): it shows the server's floor, sends the price and shows the server's refusal under the field. Since backend feature
// 31 the price can also follow the retail pricing rule: the dialog then sends `retailPricing: 'rule'` and the server writes the price.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, KeyValue, RadioGroup, TextField, toast } from '@/components/ui';
import { money } from '@/lib/format';
import { useFollowRule, useSetRetailPrice } from '../hooks/useListingMutations';
import { isMoneyText, moneyInput, sameMoney, toMoneyText } from '../lib/money';
import type { ServiceListing } from '../types';

type Values = { mode: 'rule' | 'type'; retailPrice: string };

export interface PriceDialogProps {
  listing: ServiceListing;
  onClose: () => void;
}

/** What the server says about how this price is set now: by a rule (and which), waiting for approval, or typed. */
function ruleHint(listing: ServiceListing): string {
  const parts = [
    listing.retailPriceSource === 'rule' && listing.retailPriceRule
      ? `Priced now by: ${listing.retailPriceRule.label}.`
      : 'The server prices it from the cost and keeps it up to date.',
    listing.retailPriceWaiting ? 'A price change waits for your approval on the Retail pricing tab.' : '',
  ];
  return parts.filter(Boolean).join(' ');
}

/** The form and its request. */
export function PriceDialog({ listing, onClose }: PriceDialogProps) {
  const setPrice = useSetRetailPrice();
  const follow = useFollowRule();
  const form = useForm<Values>({
    defaultValues: {
      mode: listing.retailPriceSource === 'rule' ? 'rule' : 'type',
      retailPrice: listing.retailPrice ? moneyInput(listing.retailPrice) : '',
    },
  });
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const mode = watch('mode');

  const submit = dialogSubmit(
    form,
    async (values) => {
      if (values.mode === 'rule') {
        await follow.mutateAsync(listing);
        return;
      }
      if (
        listing.retailPrice &&
        sameMoney(values.retailPrice, listing.retailPrice) &&
        listing.retailPriceSource !== 'rule'
      ) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await setPrice.mutateAsync({ listing, retailPrice: toMoneyText(values.retailPrice) });
    },
    // The server names the choice `retailPricing`; the form's radio group is `mode`.
    { fields: ['retailPrice', 'mode'], aliases: { retailPricing: 'mode' } },
  );

  return (
    <FormDialog
      open
      title="Storefront price"
      sub={listing.service.name}
      confirm="Save price"
      onClose={onClose}
      onSubmit={submit}
    >
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
            autoFocus
            hint={`Floor ${money(listing.floorPrice)}: the lowest price the server accepts. Customers see this price in their own currency with VAT added.`}
            error={errors.retailPrice}
            {...register('retailPrice', {
              validate: (value, values) =>
                values.mode !== 'type' ||
                (isMoneyText(value) && Number(value) > 0) ||
                'Enter a price greater than zero.',
            })}
          />
        )}
        <KeyValue
          rows={[
            ['B2B base price', money(listing.service.basePrice)],
            ['Supplier cost', money(listing.service.cost)],
          ]}
        />
      </div>
    </FormDialog>
  );
}
