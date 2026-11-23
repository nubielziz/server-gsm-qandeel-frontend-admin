// ShopPageSection: the "Shop page" part of the Catalog panel for one service: its listing form (saved in place) when it has a shop page,
// else the words "Not on the shop yet" with the reason it cannot go there or the publish that failed. The table's one shop switch
// arrives as `switchSlot`. It takes plain values, so it knows nothing of the services feature.
import type { ReactNode } from 'react';
import { Badge, ErrorState } from '@/components/ui';
import type { Id } from '@/lib/api';
import { useListing } from '../../hooks/useListing';
import { useStorefrontGrants } from '../../hooks/useStorefrontGrants';
import { ShopListingEditor } from './ShopListingEditor';
import { ShopPublishFailure } from './ShopPublishFailure';
import { shopBlockedText } from './shopWords';
import type { ShopPublishFailure as Failure } from './types';

export interface ShopPageSectionProps {
  serviceId: Id;
  /** The service's shop page: its id, `null` for none, `undefined` when the role may not read shop facts. */
  listingId?: Id | null;
  isListed?: boolean;
  /** Why the service cannot go on the shop now (the server's word), or `null`. */
  shopBlocked?: string | null;
  /** The failed publish of a service that has no shop page. */
  publishFailure?: Failure | null;
  /** The table's shop switch, shown at the top. */
  switchSlot?: ReactNode;
  /** The section contract of the panel: the frame scrolls to the section and takes focus, so nothing is done with it here. */
  active: boolean;
  /** Says whether the form holds unsaved changes. */
  onDirtyChange: (dirty: boolean) => void;
}

/** Reads the listing by id, then shows its form; a failed read shows the server's words with Retry. */
function ListingPart({
  listingId,
  onDirtyChange,
}: {
  listingId: Id;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const grants = useStorefrontGrants();
  const detail = useListing(listingId);
  if (detail.data && grants.ready) {
    return (
      <ShopListingEditor
        key={detail.data.id}
        listing={detail.data}
        grants={grants}
        onDirtyChange={onDirtyChange}
      />
    );
  }
  if (detail.isError) {
    return (
      <ErrorState
        title="Could not load the shop page"
        error={detail.error}
        onRetry={() => void detail.refetch()}
      />
    );
  }
  return <p className="hint">Loading the shop page…</p>;
}

/** What to say for a service that has no shop page. */
function NoListing({
  shopBlocked,
  publishFailure,
}: Pick<ShopPageSectionProps, 'shopBlocked' | 'publishFailure'>) {
  return (
    <>
      <p className="text-sm font-medium">Not on the shop yet</p>
      {shopBlocked && (
        <p className="text-sm text-ink2">It cannot go on the shop now: {shopBlockedText(shopBlocked)}.</p>
      )}
      {publishFailure && <ShopPublishFailure failure={publishFailure} />}
    </>
  );
}

/** One line for a role that may not read the shop; otherwise the switch, the state and the form or the reason. */
export function ShopPageSection({
  serviceId,
  listingId,
  isListed,
  shopBlocked,
  publishFailure,
  switchSlot,
  onDirtyChange,
}: ShopPageSectionProps) {
  if (listingId === undefined) {
    return (
      <p className="hint">The shop page is hidden: you need the storefront:read permission to see it.</p>
    );
  }
  return (
    <div className="space-y-4">
      {switchSlot}
      {listingId === null ? (
        <NoListing shopBlocked={shopBlocked} publishFailure={publishFailure} />
      ) : (
        <>
          {isListed !== undefined && (
            <Badge tone={isListed ? 'good' : 'neutral'} icon={isListed ? 'checkCircle' : 'ban'}>
              {isListed ? 'On the shop' : 'Not on the shop'}
            </Badge>
          )}
          <ListingPart
            key={`${serviceId}:${listingId}`}
            listingId={listingId}
            onDirtyChange={onDirtyChange}
          />
        </>
      )}
    </div>
  );
}
