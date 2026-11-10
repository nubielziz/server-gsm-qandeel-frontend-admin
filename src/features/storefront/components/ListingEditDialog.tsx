// ListingEditDialog: "Edit listing" (`GET` then `PATCH /admin/service-listings/:id`, and the picture routes). New in feature 22: the
// demo only switched a listing on and priced it. The listing is read when the dialog opens (the table's row has no Markdown
// bodies); Save sends only the fields that changed. The picture saves on its own, inside the dialog.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, dialogSubmit, errorText, FormDialog, Modal, toast } from '@/components/ui';
import { useListing } from '../hooks/useListing';
import { useUpdateListingContent } from '../hooks/useListingMutations';
import { changedBody, LISTING_FORM_FIELDS, toFormValues, type ListingFormValues } from '../lib/listingForm';
import { localeLabel } from '../lib/kinds';
import type { ServiceListing, ServiceListingDetail } from '../types';
import { ListingContentFields } from './ListingContentFields';
import { ListingFactsFields } from './ListingFactsFields';
import { ListingImageField } from './ListingImageField';
import { ListingSeoFields } from './ListingSeoFields';

export interface ListingEditDialogProps {
  /** The row the staff member picked; the dialog reads the full listing itself. */
  listing: ServiceListing;
  onClose: () => void;
}

/** Reads the listing, then shows the form; a failed read shows the server's words with Try again. */
export function ListingEditDialog({ listing, onClose }: ListingEditDialogProps) {
  const detail = useListing(listing.id);
  if (detail.data) return <ListingEditForm listing={detail.data} onClose={onClose} />;
  return (
    <Modal
      open
      title="Edit listing"
      sub={listing.publicTitle}
      onClose={onClose}
      error={detail.isError ? errorText(detail.error) : null}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          {detail.isError && (
            <Button variant="primary" onClick={() => void detail.refetch()}>
              Try again
            </Button>
          )}
        </>
      }
    >
      {!detail.isError && <p className="hint">Loading the listing…</p>}
    </Modal>
  );
}

/** The form and its requests. `listing` is the copy read when the dialog opened: Save compares the form with it. */
function ListingEditForm({ listing, onClose }: { listing: ServiceListingDetail; onClose: () => void }) {
  const update = useUpdateListingContent();
  const [imageUrl, setImageUrl] = useState(listing.imageUrl);
  const dir = listing.locale === 'ar' ? 'rtl' : undefined;
  const form = useForm<ListingFormValues>({ defaultValues: toFormValues(listing) });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const body = changedBody(values, listing);
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ listing, body });
    },
    { fields: LISTING_FORM_FIELDS },
  );

  return (
    <FormDialog
      open
      size="lg"
      title="Edit listing"
      sub={`${listing.service.name} · ${localeLabel(listing.locale)}`}
      confirm="Save changes"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-4">
        <ListingImageField listing={listing} imageUrl={imageUrl} onChange={setImageUrl} />
        <ListingContentFields register={register} errors={errors} dir={dir} />
        <ListingFactsFields register={register} errors={errors} />
        <ListingSeoFields register={register} errors={errors} dir={dir} />
      </div>
    </FormDialog>
  );
}
