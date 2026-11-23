// OnShopSection: the "On the shop" section of the Retail Purchase part: whether the service is on the shop, the one shop switch of the
// services feature (it arrives as `switchSlot`), why the service cannot go on the shop, and the publish that failed. Nothing is saved
// here: the switch acts at once. Every word of a reason is the server's.
import type { ReactNode } from 'react';
import { FormRow, Icon, SectionHeading, StatusSquare, ReadValue } from '@/components/ui';
import type { Id } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import type { ServiceListingDetail } from '../../types';
import { PublishFailureRow } from './PublishFailureRow';
import { shopBlockedText } from '../shop/shopWords';
import type { ShopPublishFailure } from '../shop/types';

export interface OnShopSectionProps {
  listingId: Id | null;
  /** The listing once it is read: it can say that the shop page is switched on, locked, and when it first went on. */
  listing?: ServiceListingDetail;
  isListed?: boolean;
  shopBlocked?: string | null;
  publishFailure?: ShopPublishFailure | null;
  switchSlot?: ReactNode;
}

/** The words of the state: no shop page yet, a page that is on, or a page that is off; nothing while it is not known yet. */
function stateWord(listingId: Id | null, listed: boolean | undefined): string | null {
  if (listingId === null) return 'Not on the shop yet';
  if (listed === undefined) return null;
  return listed ? 'On the shop' : 'Not on the shop';
}

/** The state with a square, the switch, the server's reasons and the failed publish. */
export function OnShopSection({
  listingId,
  listing,
  isListed,
  shopBlocked,
  publishFailure,
  switchSlot,
}: OnShopSectionProps) {
  const listed = isListed ?? listing?.isListed;
  const word = stateWord(listingId, listed);
  const blocked = shopBlocked && listed !== true ? shopBlockedText(shopBlocked) : null;
  return (
    <>
      <SectionHeading>On the shop</SectionHeading>
      <FormRow label="Status">
        {word ? (
          <p className="flex items-center gap-2 text-sm md:min-h-8">
            <StatusSquare tone={listed ? 'ok' : 'off'} label={word} />
            <span>{word}</span>
          </p>
        ) : (
          <ReadValue muted>Checking the shop page…</ReadValue>
        )}
        {listing?.listedAt && <p className="cell-sub">First on the shop {fmtDate(listing.listedAt)}</p>}
        {blocked && <p className="hint">It cannot go on the shop now: {blocked}.</p>}
        {listing?.locked && (
          <p className="hint flex items-start gap-1.5">
            <Icon name="lock" className="ic-sm mt-0.5 shrink-0" />
            <span>{listing.lockedReason ?? 'This service cannot go on the shop.'}</span>
          </p>
        )}
      </FormRow>
      {switchSlot && <FormRow label="Shop switch">{switchSlot}</FormRow>}
      {publishFailure && (
        <FormRow label="Last publish">
          <PublishFailureRow failure={publishFailure} />
        </FormRow>
      )}
    </>
  );
}
