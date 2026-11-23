// ShopPriceForm: the shop price of one listing in the Catalog panel: follow the rule or type a price, saved in place with the kit's
// FormSection. It is the same body as the Storefront price dialog.
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormSection, Icon, toast } from '@/components/ui';
import { useFollowRule, useSetRetailPrice } from '../../hooks/useListingMutations';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import type { ServiceListing } from '../../types';
import { PriceFormBody } from './PriceFormBody';
import { PRICE_FORM_OPTIONS, priceDefaults, savePriceForm, type PriceFormValues } from './priceForm';
import { useReportDirty } from './useReportDirty';

export interface ShopPriceFormProps {
  listing: ServiceListing;
  grants: StorefrontGrants;
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * Saving needs storefront:update and pricing:update (the server checks both). A locked listing cannot be priced: the server's
 * reason is shown and the controls are off. When the server's price changes under the form (a proposal applied), the form
 * starts again from the new price.
 */
export function ShopPriceForm({ listing, grants, onDirtyChange }: ShopPriceFormProps) {
  const setPrice = useSetRetailPrice();
  const follow = useFollowRule();
  const { retailPrice, retailPriceSource } = listing;
  const defaults = useMemo(
    () => priceDefaults({ retailPrice, retailPriceSource }),
    [retailPrice, retailPriceSource],
  );
  const form = useForm<PriceFormValues>({ defaultValues: defaults });
  useEffect(() => {
    form.reset(defaults);
  }, [form, defaults]);
  const { isDirty } = form.formState;
  useReportDirty(isDirty, onDirtyChange);

  const lock = grants.needsAll('storefront:update', 'pricing:update');
  const reason = lock.disabled
    ? (lock.title ?? 'You need the storefront:update and pricing:update permission')
    : listing.locked
      ? (listing.lockedReason ?? 'This service cannot go on the shop, so it has no shop price.')
      : undefined;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const sent = await savePriceForm(values, listing, {
        follow: follow.mutateAsync,
        setPrice: setPrice.mutateAsync,
      });
      if (sent) return;
      // The typed price is the stored one (25.990 over 25.99): show the stored text again, so the form is clean, and do not read as a save.
      form.reset(defaults);
      toast({ kind: 'info', title: 'Nothing changed' });
      return false;
    },
    PRICE_FORM_OPTIONS,
  );

  return (
    <FormSection
      onSubmit={submit}
      submitLabel="Save shop price"
      savedText="Shop price saved"
      submitDisabled={reason !== undefined}
      submitTitle={reason}
      dirty={isDirty}
    >
      {listing.locked && (
        <p className="flex items-start gap-1.5 text-sm text-ink2">
          <Icon name="lock" className="ic-sm mt-0.5 shrink-0" />
          <span>{listing.lockedReason ?? 'This service cannot go on the shop.'}</span>
        </p>
      )}
      <fieldset disabled={reason !== undefined} title={reason} className="min-w-0">
        <PriceFormBody form={form} listing={listing} autoFocus={false} />
      </fieldset>
    </FormSection>
  );
}
