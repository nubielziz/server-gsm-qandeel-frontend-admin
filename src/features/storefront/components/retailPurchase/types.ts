// The props of the Retail Purchase part. Plain values only: the part knows nothing of the services feature, which reads the service and
// hands these over (its adapter replaces the part's stand-in in the edit view).
import type { ReactNode } from 'react';
import type { Id, Money } from '@/lib/api';
import type { RetailPriceSource } from '../../types';
import type { ShopPublishFailure } from '../shop/types';

/**
 * What the Retail Purchase part takes. The shop keys (`listingId`, `isListed`, `shopBlocked`, `publishFailure`) are the ones a service
 * record carries only for a role with storefront:read: a key left out (`undefined`) means "not allowed", `null` means "none".
 */
export type RetailPurchasePartProps = {
  serviceId: Id;
  serviceName: string;
  /** The service's shop page: its id, `null` for none, `undefined` when the role may not read shop facts. */
  listingId?: Id | null;
  /** Whether the shop page is switched on, as the service's record says (the listing, once read, says it too). */
  isListed?: boolean;
  /** Why the service cannot go on the shop now (the server's word), or `null`. */
  shopBlocked?: string | null;
  /** The stored shop price of the service record, shown read-only while the service has no shop page. */
  retailPrice?: Money | null;
  /** Who wrote it: a pricing rule (`rule`) or a person (`manual`), the server's two words. */
  retailPriceSource?: RetailPriceSource | null;
  /** The failed publish of a service that has no shop page. */
  publishFailure?: ShopPublishFailure | null;
  /** The one shop switch of the services feature, drawn in the "On the shop" section. */
  switchSlot?: ReactNode;
  /** Says whether any section of the part holds unsaved changes. */
  onDirtyChange: (dirty: boolean) => void;
};
