// Types for the suppliers feature (`/suppliers`): the supplier and its detail, the action bodies and answers, the supplier's own services, the
// import, the links of a service, the API log and the report. The map gives tables and routes but no bodies (MISMATCHES M10), so every shape
// is an assumed contract, built from the rows in `src/lib/api/schema.gen.ts`.
import type { Id, IsoDateTime, JsonValue, Money } from '@/lib/api';
import type { SupplierApiLogRow, SupplierRow, SupplierServiceRow } from '@/lib/api/schema.gen';

// ---- Supplier ----

/** Whether the supplier takes orders: the `status` column, switched by Disable and Enable (MISMATCHES M60). */
export type SupplierStatus = 'active' | 'disabled';

/** How the supplier is doing, worked out by the server from its recent calls. Read-only. */
export type SupplierHealth = 'up' | 'degraded' | 'down';

/**
 * One supplier, as `GET /admin/suppliers` sends it (assumed contract). The columns of the table, minus the encrypted key,
 * plus what the screen needs to judge the supplier at a glance: `apiKeyHint` (the first characters of the write-only key),
 * the health figures and the open-order counts. Percentages are 0–100; a figure the server cannot give yet is `null`.
 */
export type Supplier = Pick<
  SupplierRow,
  | 'id'
  | 'name'
  | 'driver'
  | 'baseUrl'
  | 'username'
  | 'currency'
  | 'creditRate'
  | 'balance'
  | 'balanceCheckedAt'
  | 'lowBalanceAlert'
  | 'maxConcurrency'
  | 'rateLimitPerMin'
  | 'timeoutMs'
  | 'createdAt'
> & {
  status: SupplierStatus;
  apiKeyHint: string | null;
  health: SupplierHealth;
  /** Share of calls that worked in the last hour. */
  successRate1h: number | null;
  /** The same over the last 24 hours. */
  successRate24h: number | null;
  /** Median and 95th percentile of the time a call takes, in milliseconds. */
  p50Ms: number | null;
  p95Ms: number | null;
  /** Orders waiting at this supplier (pending or processing), and how many of them need a person. */
  openOrders: number;
  reviewOrders: number;
  /** The server's call on a low prepaid balance (below the alert amount, or too little for the coming days). */
  lowBalance: boolean;
  /** Days the balance lasts at the 7-day spending rate; `null` when nothing was spent. */
  runwayDays: number | null;
};

/** One hour of the last 24 (assumed contract of `GET /admin/suppliers/:id`): the share of calls that worked and the median time. */
export type HourlyPoint = { at: IsoDateTime; successRate: number; medianMs: number };

/** One supplier in a service's chain: where an order for the service goes first (priority 1), and what comes next. */
export type ChainStep = {
  priority: number;
  supplierId: Id;
  supplierName: string;
  supplierServiceId: Id;
  supplierServiceName: string;
};

/**
 * A service of the console that is linked to this supplier (`service_supplier_links`). Priority 1 is the primary
 * supplier, the others are fallbacks. `chain` is the service's whole chain, so the links editor can start from it.
 */
export type SupplierLink = {
  serviceId: Id;
  serviceName: string;
  serviceCode: string | null;
  serviceStatus: string;
  supplierServiceId: Id;
  supplierServiceName: string;
  priority: number;
  /** What the supplier charges for it. */
  cost: Money;
  slaMinutes: number | null;
  chain: ChainStep[];
};

/** `GET /admin/suppliers/:id` (assumed contract): the supplier plus its hourly history and the services linked to it. */
export type SupplierDetail = Supplier & { history: HourlyPoint[]; links: SupplierLink[] };

// ---- Supplier bodies and answers ----

/** Body of `POST /admin/suppliers` (assumed contract). `apiKey` is write-only: the server never sends it back. */
export type CreateSupplierBody = {
  name: string;
  driver: string;
  baseUrl: string;
  username: string;
  apiKey: string;
  currency: string;
  lowBalanceAlert?: Money;
  maxConcurrency?: number;
  rateLimitPerMin?: number;
  timeoutMs?: number;
};

/** Body of `PATCH /admin/suppliers/:id` (assumed contract): only the fields that change; `status` switches the supplier on or off. */
export type UpdateSupplierBody = Partial<Omit<CreateSupplierBody, 'apiKey'>> & {
  apiKey?: string;
  status?: SupplierStatus;
};

/**
 * Answer of `POST /admin/suppliers/:id/test` (assumed contract): the supplier's `accountinfo` call. A failed test can
 * come as `ok: false` with the failure text, or as an error response; the console shows either one.
 */
export type TestConnectionResult = {
  ok: boolean;
  message: string;
  httpStatus: number | null;
  durationMs: number | null;
  accountName?: string | null;
  balance?: Money | null;
};

/** Answer of `POST /admin/suppliers/:id/sync` (assumed contract): what the sync found and the balance it read. */
export type SyncResult = {
  services: number;
  added: number;
  changed: number;
  removed: number;
  balance: Money;
  balanceCheckedAt: IsoDateTime;
};

// ---- Supplier services and the import ----

/**
 * A service in the supplier's own catalogue (a synced copy, `supplier_services`; assumed contract). `imported` says
 * whether a service of the console is already linked to it.
 */
export type SupplierService = Pick<
  SupplierServiceRow,
  | 'id'
  | 'supplierId'
  | 'remoteId'
  | 'remoteGroup'
  | 'type'
  | 'name'
  | 'credit'
  | 'time'
  | 'isAvailable'
  | 'lastSeenAt'
  | 'priceChangedAt'
> & { imported: boolean; linkedServiceId: Id | null };

/** What the import preview and the import take (assumed contract): the supplier services to look at or bring in. */
export type ImportBody = { supplierServiceIds: Id[] };

/** What the preview says will happen to one item: it is new, it matches a service already imported, or its cost changed. */
export type ImportItemState = 'new' | 'matching' | 'changed';

/** One line of the preview (assumed contract). `suggestedPrice` is the server's price for a new service. */
export type ImportPreviewItem = {
  supplierServiceId: Id;
  name: string;
  type: string;
  state: ImportItemState;
  serviceId: Id | null;
  serviceName: string | null;
  cost: Money;
  previousCost: Money | null;
  suggestedPrice: Money | null;
};

/** Answer of `POST /admin/suppliers/:id/import/preview` (assumed contract). */
export type ImportPreview = { items: ImportPreviewItem[] };

/** Answer of `POST /admin/suppliers/:id/import` (assumed contract). */
export type ImportResult = { created: number; updated: number; unchanged: number };

// ---- Links of a service ----

/** One link in the body of `PUT /admin/services/:id/supplier-links`: a supplier service and its place in the chain. */
export type SupplierLinkInput = { supplierServiceId: Id; priority: number };

/** Body of `PUT /admin/services/:id/supplier-links` (assumed contract): the whole chain, replacing the old one. */
export type ReplaceLinksBody = { links: SupplierLinkInput[] };

// ---- API log ----

/**
 * One call to a supplier in the list (assumed contract): the request and response bodies are left out of the list and
 * come with `GET /admin/supplier-api-logs/:id`. `orderId` is null for calls that belong to no order (a test, a sync).
 */
export type SupplierApiLog = Pick<
  SupplierApiLogRow,
  'id' | 'supplierId' | 'action' | 'httpStatus' | 'durationMs' | 'error' | 'createdAt'
> & { orderId: Id | null };

/** One call with both bodies; the server has already masked the secrets in them. */
export type SupplierApiLogDetail = SupplierApiLog & { request: JsonValue; response: JsonValue };

// ---- Report ----

/** What `GET /admin/reports/suppliers` is asked for (assumed contract): the period in days. */
export type SupplierReportQuery = { days?: number };

/** One supplier's row of the report (assumed contract): orders sent in the period, what it cost and how it went. */
export type SupplierReportRow = {
  supplierId: Id;
  supplierName: string;
  orders: number;
  completed: number;
  rejected: number;
  spend: Money;
  /** Share of the supplier's finished orders that were rejected, 0–100. */
  rejectionRate: number | null;
  /** Average time from sending an order to its result, in seconds. */
  averageSeconds: number | null;
};
