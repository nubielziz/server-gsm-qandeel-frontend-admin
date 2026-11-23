// ShopPriceBlock: the shop price of one service for the Catalog panel's Prices section: the price form when the service has a shop
// page, the price read-only when it has none (or the role cannot read the shop), and the waiting price proposal with Apply and Keep.
// It takes plain values (no import from services).
import type { ReactNode } from 'react';
import { ErrorState } from '@/components/ui';
import type { Id, Money } from '@/lib/api';
import { useListing } from '../../hooks/useListing';
import { useStorefrontGrants } from '../../hooks/useStorefrontGrants';
import type { RetailPriceSource } from '../../types';
import { ShopPriceForm } from './ShopPriceForm';
import { ShopPriceReadOnly } from './ShopPriceReadOnly';
import { ShopProposal } from './ShopProposal';

export interface ShopPriceBlockProps {
  serviceId: Id;
  /** The service's shop page: its id, `null` for none, `undefined` when the role may not read shop facts. */
  listingId?: Id | null;
  /** The shop price of the row. Every reader of the catalog gets it, so it shows even where the listing cannot be read. */
  retailPrice?: Money | null;
  /** Who wrote the shop price of the row: a shop price rule or a person (`manual`). */
  retailPriceSource?: RetailPriceSource | null;
  /** Says whether the price form holds unsaved changes. */
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * The listing is read by id (the same read the shop page section uses); the proposal needs pricing:read. Without a listing (none, or a
 * role that may not read shop facts) the row's own price is shown read-only: it is not hidden from any reader of the catalog.
 */
export function ShopPriceBlock({
  serviceId,
  listingId,
  retailPrice,
  retailPriceSource,
  onDirtyChange,
}: ShopPriceBlockProps) {
  const grants = useStorefrontGrants();
  const detail = useListing(listingId);
  let price: ReactNode;
  if (listingId == null) {
    price = (
      <ShopPriceReadOnly
        retailPrice={retailPrice}
        retailPriceSource={retailPriceSource}
        noShopPage={listingId === null}
      />
    );
  } else if (detail.data && grants.ready) {
    price = (
      <ShopPriceForm
        key={detail.data.id}
        listing={detail.data}
        grants={grants}
        onDirtyChange={onDirtyChange}
      />
    );
  } else if (detail.isError) {
    price = (
      <ErrorState
        title="Could not load the shop price"
        error={detail.error}
        onRetry={() => void detail.refetch()}
      />
    );
  } else {
    price = <p className="hint">Loading the shop price…</p>;
  }

  return (
    <div className="space-y-4">
      {price}
      {grants.ready && grants.can('pricing:read') && <ShopProposal serviceId={serviceId} grants={grants} />}
    </div>
  );
}
