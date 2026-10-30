// Types for the customers feature (`/customers`, `/customers/:id`, `/admin/data-requests`): the customer and its detail, the
// action bodies, the data requests and the list filters. The map names the routes but gives no bodies (MISMATCHES M10), so every
// shape below is an assumed contract, built from the generated rows in `src/lib/api/schema.gen.ts` and narrowed to what the screens use.
import type { Id, IsoDateTime, Money } from '@/lib/api';
import type { CustomerRow, DataRequestRow } from '@/lib/api/schema.gen';

// ---- Customer ----

/** Where a customer stands: active, paused by a person (suspended), stopped for fraud (blocked) or erased (anonymized). */
export type CustomerStatus = 'active' | 'suspended' | 'blocked' | 'anonymized';

/** How risky the account looks. The demo says `med`; the API word is `medium` (MISMATCHES M82). */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * One customer as `GET /admin/customers` sends a row (assumed contract): the `customers` table with the words narrowed, and
 * the two list aggregates `ordersCount` and `lastOrderAt` (the sort and the Orders column need them). `currencyCode` is an
 * optional join (the table only has the currency id); without it the list shows the country alone.
 * `createdBy` is null for a customer who signed up or checked out alone, and a staff id for one added by the team.
 */
export type Customer = Omit<
  CustomerRow,
  'riskLevel' | 'status' | 'suspendedReason' | 'suspendedBy' | 'updatedAt'
> & {
  riskLevel: RiskLevel;
  status: CustomerStatus;
  suspendedReason: string | null;
  suspendedBy: Id | null;
  ordersCount: number;
  lastOrderAt: IsoDateTime | null;
  currencyCode?: string | null;
};

/** The five figures above the detail tabs. `spent` is money from the server; the console only formats it. */
export type CustomerStats = {
  orders: number;
  spent: Money;
  lastOrderAt: IsoDateTime | null;
  refunds: number;
  tickets: number;
  disputes: number;
};

/** The sign-in side of a customer who has an account (the `customer_credentials` row and the open sessions). */
export type CustomerAccount = {
  emailVerified: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: IsoDateTime | null;
  /** When the latest invitation or reset link went out. */
  resetSentAt: IsoDateTime | null;
  activeSessions: number;
  lastIp: string | null;
};

/**
 * One line of the consent evidence: what was agreed (`purpose`), the legal document with its version when there is one
 * (for example `Terms of service v3.2`), when, and from which address.
 */
export type ConsentRecord = { purpose: string; document: string | null; at: IsoDateTime; ip: string };

/** The consent records stored with the customer's latest order. */
export type LatestConsents = { orderId: Id; records: ConsentRecord[] };

/** One risk signal seen on an order, with the order it was seen on. */
export type RiskSignal = { text: string; orderId: Id };

/** The risk side of the detail: the highest score on any order (null without orders) and the signals behind it. */
export type CustomerRisk = { highestScore: number | null; signals: RiskSignal[] };

/**
 * `GET /admin/customers/:id` (assumed contract): the list row plus the figures, the account (null for a guest), the latest
 * consent records (null when there is no order) and the risk summary.
 */
export type CustomerDetail = Customer & {
  stats: CustomerStats;
  account: CustomerAccount | null;
  latestConsents: LatestConsents | null;
  risk: CustomerRisk;
};

// ---- Action bodies ----

/** How a customer gets a password: an emailed link to choose one, or a temporary one the server makes (MISMATCHES M12). */
export type PasswordMode = 'reset_link' | 'temporary_password';

/** Body of `POST /admin/customers` (assumed contract). `phone` is left out when empty. */
export type CreateCustomerBody = {
  name: string;
  email: string;
  country: string;
  locale: string;
  phone?: string;
  password: { mode: PasswordMode };
};

/** The new customer; `temporaryPassword` is present once, only for the temporary-password mode. */
export type CreateCustomerResult = Customer & { temporaryPassword?: string };

/** Body of `PATCH /admin/customers/:id`: only the fields that change (assumed contract). */
export type UpdateCustomerBody = {
  name?: string;
  email?: string;
  country?: string;
  locale?: string;
  phone?: string;
  internalNotes?: string;
};

/** Body of `POST /admin/customers/:id/account` (assumed contract): how the guest gets a password. */
export type CreateAccountBody = { mode: PasswordMode };

/** Body of `POST /admin/customers/:id/password` (assumed contract). */
export type CustomerPasswordBody = { mode: PasswordMode; revokeSessions: boolean };

/** Answer of the account and password routes: the temporary password, shown once, for the temporary mode only. */
export type PasswordResult = { temporaryPassword?: string };

/** Body of `POST /admin/customers/:id/suspend` (assumed contract): a reason from the list and an optional note. */
export type SuspendCustomerBody = { reason: string; note?: string };

/** Body of `POST /admin/customers/:id/block` (assumed contract): block with a reason, or lift the block. */
export type BlockCustomerBody = { blocked: true; reason: string } | { blocked: false };

// ---- Data requests ----

/** What the person asked for: a copy of their data (`export`) or the removal of it (`erasure`). */
export type DataRequestKind = 'export' | 'erasure';

/** Where a request is: waiting, being worked on, fulfilled (the demo's "Done") or refused. */
export type DataRequestStatus = 'open' | 'in_progress' | 'completed' | 'rejected';

/**
 * One data-subject request, as `GET /admin/data-requests` sends it (assumed contract): the table row with the words narrowed
 * and the customer's name joined. `dueAt` is the legal deadline.
 */
export type DataRequest = Omit<DataRequestRow, 'kind' | 'status' | 'handledBy' | 'fileId' | 'updatedAt'> & {
  kind: DataRequestKind;
  status: DataRequestStatus;
  handledBy: Id | null;
  fileId: Id | null;
  customerName: string;
};

/** Body of `PATCH /admin/data-requests/:id` (assumed contract): the new status and an optional note for the audit log. */
export type UpdateDataRequestBody = { status: Exclude<DataRequestStatus, 'open'>; note?: string };

// ---- List filters ----

/**
 * What the customers list filters by (simple-rest field filters plus `q`, `GET /admin/customers`): an array repeats the
 * key, so the Flagged tab is `riskLevel: ['medium', 'high']`. `q` searches the name and the email.
 */
export type CustomerListFilters = {
  q?: string;
  country?: string;
  status?: CustomerStatus | CustomerStatus[];
  riskLevel?: RiskLevel | RiskLevel[];
  hasAccount?: boolean;
};

/** What the data-requests list filters by (`GET /admin/data-requests`). */
export type DataRequestFilters = {
  status?: DataRequestStatus | DataRequestStatus[];
  kind?: DataRequestKind;
  customerId?: Id;
};
