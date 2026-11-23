// PriceForm: the shop price of one listing as a section of the Retail Purchase part: follow the rule or type a price, saved in place with
// its own button. The same values, rules and requests as the Storefront price dialog (shop/priceForm.ts).
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, SectionForm, toast, useReportDirty, type ReportSection } from '@/components/ui';
import { useFollowRule, useSetRetailPrice } from '../../hooks/useListingMutations';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import type { ServiceListing } from '../../types';
import { PRICE_FORM_OPTIONS, priceDefaults, savePriceForm, type PriceFormValues } from '../shop/priceForm';
import { PriceRows } from './PriceRows';

export interface PriceFormProps {
  listing: ServiceListing;
  grants: StorefrontGrants;
  report: ReportSection;
}

/**
 * Saving needs storefront:update and pricing:update (the server checks both). A locked listing cannot be priced: the controls are off
 * (the "On the shop" section says why). When the server's price changes under the form (a proposal applied), the form starts again
 * from the new price.
 */
export function PriceForm({ listing, grants, report }: PriceFormProps) {
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
  useReportDirty(isDirty, (dirty) => report('price', dirty));

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
    <SectionForm
      onSubmit={submit}
      submitLabel="Save shop price"
      savedText="Shop price saved"
      lock={{ disabled: reason !== undefined, title: reason }}
      dirty={isDirty}
    >
      <fieldset disabled={reason !== undefined} title={reason} className="min-w-0">
        <PriceRows form={form} listing={listing} />
      </fieldset>
    </SectionForm>
  );
}
