// PriceDialog: "Storefront price" for one listing (`PATCH /admin/service-listings/:id`). Ports `sf-price` of 50-p-storefront.js. The
// demo worked out margin and gateway fee while typing and refused a price under the floor itself; the console does no pricing maths
// (MISMATCHES M92): it shows the server's floor, sends the price and shows the server's refusal under the field.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, KeyValue, TextField, toast } from '@/components/ui';
import { money } from '@/lib/format';
import { useSetRetailPrice } from '../hooks/useListingMutations';
import { isMoneyText, moneyInput, sameMoney, toMoneyText } from '../lib/money';
import type { ServiceListing } from '../types';

type Values = { retailPrice: string };

export interface PriceDialogProps {
  listing: ServiceListing;
  onClose: () => void;
}

/** The form and its request. */
export function PriceDialog({ listing, onClose }: PriceDialogProps) {
  const setPrice = useSetRetailPrice();
  const form = useForm<Values>({
    defaultValues: { retailPrice: listing.retailPrice ? moneyInput(listing.retailPrice) : '' },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      if (listing.retailPrice && sameMoney(values.retailPrice, listing.retailPrice)) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await setPrice.mutateAsync({ listing, retailPrice: toMoneyText(values.retailPrice) });
    },
    { fields: ['retailPrice'] },
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
        <TextField
          label="Price shown to customers (USD, before VAT)"
          className="mono"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          hint={`Floor ${money(listing.floorPrice)}: the lowest price the server accepts. Customers see this price in their own currency with VAT added.`}
          error={errors.retailPrice}
          {...register('retailPrice', {
            validate: (value) =>
              (isMoneyText(value) && Number(value) > 0) || 'Enter a price greater than zero.',
          })}
        />
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
