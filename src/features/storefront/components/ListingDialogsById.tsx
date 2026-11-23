// ListingDialogsById: the Edit listing and Storefront price dialogs for a screen that knows only a listing's id and the service's name
// (the Catalog's row menu). The listing is read first (`GET /admin/service-listings/:id`), then the dialog opens on it, so the row needs
// no listing figures of its own. A failed read shows the server's words with Try again.
import type { ReactNode } from 'react';
import { Button, errorText, Modal } from '@/components/ui';
import type { Id } from '@/lib/api';
import { useListing } from '../hooks/useListing';
import type { ServiceListingDetail } from '../types';
import { ListingEditDialog } from './ListingEditDialog';
import { PriceDialog } from './PriceDialog';

export interface ListingDialogByIdProps {
  listingId: Id;
  /** The service's name, shown under the title while the listing is read. */
  name?: string;
  onClose: () => void;
}

type LoaderProps = ListingDialogByIdProps & {
  title: string;
  children: (listing: ServiceListingDetail) => ReactNode;
};

/** Reads the listing and gives it to `children`; until then a small loading dialog, or the server's error with Try again. */
function ListingLoader({ listingId, name, title, onClose, children }: LoaderProps) {
  const detail = useListing(listingId);
  if (detail.data) return <>{children(detail.data)}</>;
  return (
    <Modal
      open
      title={title}
      sub={name}
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

/** "Edit listing" for a listing id: reads the listing, then opens the editor on it. */
export function ListingEditDialogById(props: ListingDialogByIdProps) {
  return (
    <ListingLoader {...props} title="Edit listing">
      {(listing) => <ListingEditDialog listing={listing} onClose={props.onClose} />}
    </ListingLoader>
  );
}

/** "Storefront price" for a listing id: reads the listing, then opens the price dialog on it. */
export function PriceDialogById(props: ListingDialogByIdProps) {
  return (
    <ListingLoader {...props} title="Storefront price">
      {(listing) => <PriceDialog listing={listing} onClose={props.onClose} />}
    </ListingLoader>
  );
}
