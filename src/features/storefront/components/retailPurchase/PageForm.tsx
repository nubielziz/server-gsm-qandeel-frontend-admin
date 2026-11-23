// PageForm: the shop page (listing) of a service as a section of the Retail Purchase part: the 30-day figures and the listing form, saved
// in place with its own button. The picture saves at once on its own requests. The listing is read by the part above it.
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  dialogSubmit,
  FormRow,
  ReadValue,
  SectionForm,
  toast,
  useReportDirty,
  type ReportSection,
} from '@/components/ui';
import { money, num } from '@/lib/format';
import { useUpdateListingContent } from '../../hooks/useListingMutations';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { LISTING_FORM_FIELDS, toFormValues, type ListingFormValues } from '../../lib/listingForm';
import type { ServiceListingDetail } from '../../types';
import { ListingFormBody } from '../shop/ListingFormBody';
import { saveListingForm } from '../shop/listingSave';

export interface PageFormProps {
  listing: ServiceListingDetail;
  grants: StorefrontGrants;
  report: ReportSection;
}

/** The orders and revenue of the last 30 days when the listing carries them, then the form. Saving needs storefront:update. */
export function PageForm({ listing, grants, report }: PageFormProps) {
  const update = useUpdateListingContent();
  const form = useForm<ListingFormValues>({ defaultValues: toFormValues(listing) });
  const { isDirty } = form.formState;
  useReportDirty(isDirty, (dirty) => report('page', dirty));
  // The copy the form was last reset from. A save compares with it, never with a newer copy that arrived while the form held edits
  // (another save of the same listing): comparing with that one would send the old text back over the other save.
  const base = useRef(listing);
  // A form with no edits follows the server's copy: after a save made elsewhere it starts again from it. A form with edits keeps them.
  // It reacts to a new copy only, so its own save (which resets the form) is not undone by the copy that is still old.
  useEffect(() => {
    if (form.formState.isDirty) return;
    base.current = listing;
    form.reset(toFormValues(listing));
  }, [form, listing]);
  const lock = grants.needs('storefront:update');
  const reason = lock.disabled ? (lock.title ?? 'You need the storefront:update permission') : undefined;

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
    <SectionForm
      onSubmit={submit}
      submitLabel="Save shop page"
      lock={{ disabled: lock.disabled, title: reason }}
      dirty={isDirty}
    >
      {typeof listing.orders30d === 'number' && (
        <FormRow label="Orders, 30 days">
          <ReadValue>{num(listing.orders30d)}</ReadValue>
        </FormRow>
      )}
      {listing.revenue30d != null && (
        <FormRow label="Revenue, 30 days">
          <ReadValue>{money(listing.revenue30d)}</ReadValue>
        </FormRow>
      )}
      <ListingFormBody form={form} listing={listing} disabledReason={reason} layout="row" />
    </SectionForm>
  );
}
