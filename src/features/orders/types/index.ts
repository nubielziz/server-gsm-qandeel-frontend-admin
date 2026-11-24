// Types for the orders feature (`/orders`): the order and its timeline, the action bodies and the filters of the list.
// The map gives the order's table and one example but no bodies (MISMATCHES M10), so every shape below is an assumed
// contract, built from the generated rows in `src/lib/api/schema.gen.ts` and narrowed to what the screens use.
import type { RankKind } from '@/features/accounts';
import type { Id, IsoDateTime } from '@/lib/api';
import type { OrderEventRow, OrderRow } from '@/lib/api/schema.gen';
import type { ServiceType } from '@/lib/serviceTypes';

// ---- Order ----

/** Where an order is in its life, as the API says it: Dhru codes 0, 1, 4 and 3 (MISMATCHES M20). */
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'rejected';

/** The staff queue an order waits in. `null` means nobody has to act on it. */
export type OrderQueue = 'pending' | 'manual' | 'needs_attention' | 'verification' | 'review';

/** The door an order came through: merchant orders (API and portal) or storefront orders (paid by card, crypto or store balance). */
export type OrderChannel = 'b2b' | 'b2c';

/** The four kinds of service (the map's order example), shown as IMEI, Server, Remote and File. Kept in the shared layer. */
export type { ServiceType };

/** A record named in a join. */
export type NamedRef = { id: Id; name: string };

/** The rank of the buyer, named in a join. The wire says `merchant` and `retail`. */
export type OrderRank = NamedRef & { kind: RankKind };

/**
 * The buyer of an order: one account type carries merchants and shop customers, told apart by `rank`. A guest is an account made by
 * a checkout, with no login. `email` is masked by the server for staff without `clients:read`.
 */
export type OrderAccount = NamedRef & { email: string; rank: OrderRank; guest: boolean };

/** The ordered service. `slaMinutes` is the target time; `category` names the service's category when sent. */
export type OrderService = NamedRef & { type: ServiceType; slaMinutes: number; category?: string | null };

/** The result the buyer gets: a code or text, an optional comment and an optional file. */
export type OrderResult = { code: string | null; comment: string | null; fileId: Id | null };

/**
 * One order, as `GET /admin/orders` and `GET /admin/orders/:id` send it (assumed contract). Names of the joined
 * records are included so a row needs no second request. `imei` holds the main input whatever the service type
 * (an IMEI, an account, a serial number or a model).
 */
export type Order = Pick<
  OrderRow,
  | 'id'
  | 'dispatchState'
  | 'imei'
  | 'quantity'
  | 'inputs'
  | 'unitPrice'
  | 'totalPrice'
  | 'unitCost'
  | 'totalCost'
  | 'currency'
  | 'taxAmount'
  | 'pricingSnapshot'
  | 'createdAt'
> & {
  status: OrderStatus;
  queue: OrderQueue | null;
  /** Why the order is in a review queue, in words the team can read. */
  reviewReason: string | null;
  channel: OrderChannel;
  /** How it arrived (`dhru`, `portal`, `store`; `v1` on an order from before the REST API was retired). */
  source: string;
  service: OrderService;
  /** The buyer, whatever the door: merchant ranks order from the portal and the API, retail ranks from the shop. */
  account: OrderAccount;
  supplier: NamedRef | null;
  supplierRef: string | null;
  attempts: number;
  result: OrderResult;
  verificationStatus: string | null;
  inputFileId: Id | null;
  adminNote: string | null;
  sentAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
};

// ---- Timeline ----

/** Who did something to the order. `client` and `customer` are the words of rows written before the accounts merged; new rows say `account`. */
export type EventActorType = 'staff' | 'account' | 'client' | 'customer' | 'system' | 'supplier';

/**
 * One line of the order's history (`GET /admin/orders/:id/events`, assumed contract). `data` is free-form; when it
 * has a `message` the console shows that sentence, else it builds one from the event type and the other fields
 * (`reason`, `body`…). `account` is the account the actor is: the server resolves an old `client` or `customer` row through the
 * legacy map, so the console never guesses; `null` for staff, supplier and system rows.
 */
export type OrderEvent = Omit<
  OrderEventRow,
  'orderId' | 'actorType' | 'actorId' | 'fromStatus' | 'toStatus' | 'updatedAt'
> & {
  fromStatus: string | null;
  toStatus: string | null;
  actor: { type: EventActorType; id: Id | null; name: string | null };
  account: { id: Id } | null;
};

// ---- Action bodies ----

/** Body of `POST /admin/orders/:id/reply` (assumed contract): the result text and an optional comment. */
export type ReplyOrderBody = { code: string; comment?: string };

/** Body of `POST /admin/orders/:id/reject` (assumed contract): the reason the buyer sees with the refund. */
export type RejectOrderBody = { reason: string };

/** Body of `POST /admin/orders/:id/reopen` (assumed contract). */
export type ReopenOrderBody = { reason?: string };

/** Body of `POST /admin/orders/:id/refund` (assumed contract). */
export type RefundOrderBody = { reason: string };

/** The two answers to a verification request. */
export type VerificationDecision = 'accept' | 'refund';

/** Body of `POST /admin/orders/:id/verification` (assumed contract). */
export type VerificationBody = { decision: VerificationDecision; note?: string };

/** Body of `POST /admin/orders/:id/notes` (assumed contract): an internal note for the team. */
export type OrderNoteBody = { body: string };

/** Body of `POST /admin/orders/:id/change-supplier` (assumed contract): the new supplier, and/or forget the old reference. */
export type ChangeSupplierBody = { supplierId?: Id; resetReference?: boolean };

// ---- Bulk reply ----

/** Body of `POST /admin/orders/bulk-reply/preview` (assumed contract): the pasted lines as they are. */
export type BulkReplyPreviewBody = { text: string };

/** How the server read one pasted line. */
export type BulkReplyLineStatus = 'matched' | 'not_found' | 'ambiguous' | 'invalid' | 'not_open';

/** One pasted line and the order it matched, if any. `line` counts from 1. */
export type BulkReplyLine = {
  line: number;
  raw: string;
  imei: string | null;
  code: string | null;
  orderId: Id | null;
  status: BulkReplyLineStatus;
};

/** Answer of the preview (assumed contract). */
export type BulkReplyPreview = { lines: BulkReplyLine[] };

/** One reply to apply. */
export type BulkReplyItem = { orderId: Id; code: string };

/** Body of `POST /admin/orders/bulk-reply/apply` (assumed contract). */
export type BulkReplyApplyBody = { items: BulkReplyItem[] };

/** Answer of the apply (assumed contract): how many orders were completed and which ones were refused, with the reason. */
export type BulkReplyResult = { applied: number; failed: { orderId: Id; title: string }[] };

// ---- List filters ----

/**
 * What the list endpoint filters by (simple-rest field filters plus `q`, `GET /admin/orders`): an array repeats the
 * key. `accountId` is the buyer (a merchant number is an account number) and `rankId` the buyer's rank; `clientId` and
 * `customerId` are not sent any more (`customerId` answers 422). `pastSla` asks for the open orders that are late; the server
 * decides which ones those are.
 */
export type OrderListFilters = {
  status?: OrderStatus | OrderStatus[];
  queue?: OrderQueue | OrderQueue[];
  q?: string;
  type?: ServiceType;
  supplierId?: Id;
  accountId?: Id;
  rankId?: Id;
  channel?: OrderChannel;
  pastSla?: boolean;
};

// ---- Lookups for the filter menus ----

/**
 * A supplier as the filter menu and the reroute menu need it (assumed contract; the suppliers feature owns the
 * route). Only `'down'` and `'degraded'` get special treatment.
 */
export type SupplierOption = NamedRef & { status?: string; enabled?: boolean };

/** An account as the merchant filter needs it (the accounts feature owns `GET /admin/clients`). */
export type AccountOption = NamedRef;

/** A rank as the rank filter needs it (the accounts feature owns `GET /admin/client-groups`). */
export type RankOption = NamedRef;
