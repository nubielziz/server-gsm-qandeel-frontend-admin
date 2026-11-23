// A test host for the Retail Purchase part: it stands in for the Product / Services edit view, which reads the service and hands the part its
// plain values. It shows what the part reported about unsaved changes, can move the part to another shop page (as another service opens),
// can save the listing from elsewhere (the older Edit dialog) and can read the service's own record (to see what a write makes stale).
// Import it from tests only; the helpers that open it are in retailPurchase.ts.
import { useOne } from '@refinedev/core';
import { useState } from 'react';
import { getListing } from '../api';
import { RetailPurchasePart } from '../components/retailPurchase/RetailPurchasePart';
import type { RetailPurchasePartProps } from '../components/retailPurchase/types';
import { useListing } from '../hooks/useListing';
import { useUpdateListingContent } from '../hooks/useListingMutations';

export const ATT = 'AT&T USA Premier Unlock';
/** The service and the shop page of the mock seed that have the same id. */
export const ATT_SERVICE = 5;
/** What "Save elsewhere" stores in the summary. */
export const ELSEWHERE = 'Saved in the Edit dialog.';

export type RetailHostProps = Partial<Omit<RetailPurchasePartProps, 'onDirtyChange'>> & {
  /** Adds a button that moves the part to this shop page, as the edit view does when another service opens. */
  other?: number;
  /** Adds a second editor of the ATT shop page and the copy of it that the part reads. */
  elsewhere?: boolean;
  /** Also reads the service's own record, as the edit view does, so a test can see whether a write reads it again. */
  withRecord?: boolean;
};

/** Another place that saves the ATT shop page: it stores one field and makes the part's read copy old. */
function SaveElsewhere() {
  const update = useUpdateListingContent();
  const copy = useListing(ATT_SERVICE).data;
  return (
    <>
      <p>{`Read copy: ${copy?.summary ?? ''}`}</p>
      <button
        type="button"
        onClick={() =>
          void getListing(ATT_SERVICE).then((listing) =>
            update.mutateAsync({ listing, body: { summary: ELSEWHERE } }),
          )
        }
      >
        Save elsewhere
      </button>
    </>
  );
}

/** The service's own record, read by Refine as the edit view reads it. */
function ServiceRecord({ id }: { id: number }) {
  const { result } = useOne<{ name: string }>({ resource: 'services', id, errorNotification: false });
  return <p>{result ? `Record of ${result.name}` : 'Reading the record'}</p>;
}

/** The part for the ATT service (listed, with its shop page) unless the props say otherwise; `listingId: undefined` is a role that may not read the shop. */
export function RetailHost({ other, elsewhere, withRecord, ...props }: RetailHostProps) {
  const [dirty, setDirty] = useState(false);
  const [listingId, setListingId] = useState(
    'listingId' in props ? (props.listingId as number | null | undefined) : ATT_SERVICE,
  );
  const serviceId = props.serviceId ?? ATT_SERVICE;
  return (
    <>
      <p>{dirty ? 'Unsaved changes' : 'No unsaved changes'}</p>
      {withRecord && <ServiceRecord id={serviceId} />}
      {elsewhere && <SaveElsewhere />}
      {other !== undefined && (
        <button type="button" onClick={() => setListingId(other)}>
          Show the other shop page
        </button>
      )}
      <RetailPurchasePart
        serviceId={serviceId}
        serviceName={ATT}
        isListed
        switchSlot={<button type="button">Shop switch</button>}
        {...props}
        listingId={listingId}
        onDirtyChange={setDirty}
      />
    </>
  );
}
