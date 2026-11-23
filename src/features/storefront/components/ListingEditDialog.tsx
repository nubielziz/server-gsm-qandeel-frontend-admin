// ListingEditDialog: "Edit listing" (`GET` then `PATCH /admin/service-listings/:id`, and the picture routes). New in feature 22: the
// demo only switched a listing on and priced it. The listing is read when the dialog opens (the table's row has no Markdown
// bodies); Save sends only the fields that changed. The picture saves on its own, inside the dialog. The fields are the shop page
// section's body (components/shop/ListingFormBody), the same the Catalog panel shows.
import { useForm } from 'react-hook-form';
import { Button, dialogSubmit, errorText, FormDialog, Modal, toast } from '@/components/ui';
import { useListing } from '../hooks/useListing';
import { useUpdateListingContent } from '../hooks/useListingMutations';
import { LISTING_FORM_FIELDS, toFormValues, type ListingFormValues } from '../lib/listingForm';
import type { ServiceListing, ServiceListingDetail } from '../types';
import { saveListingForm } from './shop/listingSave';
import { ListingFormBody } from './shop/ListingFormBody';

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
  const form = useForm<ListingFormValues>({ defaultValues: toFormValues(listing) });

  const submit = dialogSubmit(
    form,
    async (values) => {
      const saved = await saveListingForm(values, listing, update.mutateAsync);
      if (!saved) toast({ kind: 'info', title: 'Nothing changed' });
    },
    { fields: LISTING_FORM_FIELDS },
  );

  return (
    <FormDialog
      open
      size="lg"
      title="Edit listing"
      sub={listing.service.name}
      confirm="Save changes"
      onClose={onClose}
      onSubmit={submit}
    >
      <ListingFormBody form={form} listing={listing} />
    </FormDialog>
  );
}
