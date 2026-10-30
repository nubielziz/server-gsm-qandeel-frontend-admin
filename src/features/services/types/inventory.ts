// Types of the Code inventory tab: the stock of digital codes, the import and the void action. The map gives the table but
// no bodies (MISMATCHES M10), so every shape here is an assumed contract.
import type { Id, IsoDateTime } from '@/lib/api';
import type { InventoryCodeRow } from '@/lib/api/schema.gen';
import type { NamedRef } from './service';

/** `available` codes can still be sold; `sold` ones went to an order; `void` ones were taken out of stock. */
export type InventoryStatus = 'available' | 'reserved' | 'sold' | 'void';

/**
 * One code of the stock (`GET /admin/inventory-codes`, assumed contract). The code itself never leaves the server: the
 * list sends `maskedCode`, which hides everything except the last four characters.
 */
export type InventoryCode = Pick<InventoryCodeRow, 'id' | 'batchRef'> & {
  maskedCode: string;
  service: NamedRef;
  status: InventoryStatus;
  orderId: Id | null;
  createdAt: IsoDateTime;
};

/** What `GET /admin/inventory-codes` filters by (simple-rest field filters). */
export type InventoryFilters = { serviceId?: Id; status?: InventoryStatus };

/** Body of `POST /admin/services/:id/inventory/import` (assumed contract): one code per entry, as pasted. */
export type ImportCodesBody = { codes: string[]; batchRef?: string };

/** Answer of the import (assumed contract): how the server sorted the lines it got. */
export type ImportCodesResult = { imported: number; duplicates: number; rejected: number; batchRef?: string };

/** Body of `POST /admin/inventory-codes/void` (assumed contract): the codes to take out of stock. */
export type VoidCodesBody = { ids: Id[] };

/** Answer of the void action (assumed contract): `skipped` counts codes that were not unsold. */
export type VoidCodesResult = { voided: number; skipped: number };
