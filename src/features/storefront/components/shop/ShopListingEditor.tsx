// ShopListingEditor: the shop page (listing) form of the Catalog panel: the lock note, the 30-day figures and the listing form, saved
// in place with the kit's FormSection. It is one section of the panel; the listing is read by the part above it.
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormSection, Icon, KeyValue, toast } from '@/components/ui';
import { money, num } from '@/lib/format';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { useUpdateListingContent } from '../../hooks/useListingMutations';
import { LISTING_FORM_FIELDS, toFormValues, type ListingFormValues } from '../../lib/listingForm';
import type { ServiceListingDetail } from '../../types';
import { ListingFormBody } from './ListingFormBody';
import { saveListingForm } from './listingSave';
import { useReportDirty } from './useReportDirty';

export interface ShopListingEditorProps {
  listing: ServiceListingDetail;
  grants: StorefrontGrants;
  onDirtyChange: (dirty: boolean) => void;
}

/** The server's lock reason, the orders and revenue of the last 30 days when the listing carries them, and the form. */
export function ShopListingEditor({ listing, grants, onDirtyChange }: ShopListingEditorProps) {
  const update = useUpdateListingContent();
  const form = useForm<ListingFormValues>({ defaultValues: toFormValues(listing) });
  const { isDirty } = form.formState;
  useReportDirty(isDirty, onDirtyChange);
  // The copy the form was last reset from. A save compares with it, never with a newer copy that arrived while the form held edits
  // (another save of the same listing): comparing with that one would send the old text back over the other save.
  const base = useRef(listing);
  // A form with no edits follows the server's copy: after a save made elsewhere (the Edit dialog) it starts again from it. A form with
  // edits keeps them. It reacts to a new copy only, so its own save (which resets the form) is not undone by the copy that is still old.
  useEffect(() => {
    if (form.formState.isDirty) return;
    base.current = listing;
    form.reset(toFormValues(listing));
  }, [form, listing]);
  const lock = grants.needs('storefront:update');
  const reason = lock.disabled ? (lock.title ?? 'You need the storefront:update permission') : undefined;
  const figures = [
    typeof listing.orders30d === 'number' && (['Orders, 30 days', num(listing.orders30d)] as const),
    listing.revenue30d != null && (['Revenue, 30 days', money(listing.revenue30d)] as const),
  ];

  const submit = dialogSubmit(
    form,
    async (values) => {
      const saved = await saveListingForm(values, base.current, update.mutateAsync);
      if (!saved) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      // The form now starts from what the server stored, and the next save compares with it (the read copy is refreshed by the write).
      base.current = saved;
      form.reset(toFormValues(saved));
    },
    { fields: LISTING_FORM_FIELDS },
  );

  return (
    <div className="space-y-4">
      {listing.locked && (
        <p className="flex items-start gap-1.5 text-sm text-ink2">
          <Icon name="lock" className="ic-sm mt-0.5 shrink-0" />
          <span>{listing.lockedReason ?? 'This service cannot go on the shop.'}</span>
        </p>
      )}
      {figures.some(Boolean) && <KeyValue rows={figures} />}
      <FormSection
        onSubmit={submit}
        submitLabel="Save shop page"
        submitDisabled={lock.disabled}
        submitTitle={reason}
        dirty={isDirty}
      >
        <ListingFormBody form={form} listing={listing} disabledReason={reason} />
      </FormSection>
    </div>
  );
}
