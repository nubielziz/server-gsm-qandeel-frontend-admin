// PriceDialog: "Storefront price" for one listing (`PATCH /admin/service-listings/:id`). Ports `sf-price` of 50-p-storefront.js. The
// demo worked out margin and gateway fee while typing and refused a price under the floor itself; the console does no pricing maths
// (MISMATCHES M92): it shows the server's floor, sends the price and shows the server's refusal under the field. Since backend feature
// 31 the price can also follow the retail pricing rule: the dialog then sends `retailPricing: 'rule'` and the server writes the price.
// The fields are the shop price block's body (components/shop/PriceFormBody), the same the Catalog panel shows.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, toast } from '@/components/ui';
import { useFollowRule, useSetRetailPrice } from '../hooks/useListingMutations';
import type { ServiceListing } from '../types';
import { PRICE_FORM_OPTIONS, priceDefaults, savePriceForm, type PriceFormValues } from './shop/priceForm';
import { PriceFormBody } from './shop/PriceFormBody';

export interface PriceDialogProps {
  listing: ServiceListing;
  onClose: () => void;
}

/** The form and its request. */
export function PriceDialog({ listing, onClose }: PriceDialogProps) {
  const setPrice = useSetRetailPrice();
  const follow = useFollowRule();
  const form = useForm<PriceFormValues>({ defaultValues: priceDefaults(listing) });

  const submit = dialogSubmit(
    form,
    async (values) => {
      const sent = await savePriceForm(values, listing, {
        follow: follow.mutateAsync,
        setPrice: setPrice.mutateAsync,
      });
      if (!sent) toast({ kind: 'info', title: 'Nothing changed' });
    },
    PRICE_FORM_OPTIONS,
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
      <PriceFormBody form={form} listing={listing} />
    </FormDialog>
  );
}
