// Types for the dashboard (`/dashboard`): what `GET /admin/dashboard` and `GET /admin/reports/top-clients` send. The map names the
// routes and the `scope` filter but gives no bodies (MISMATCHES M10), so every shape below is an assumed contract, written from
// what the demo's dashboard shows. Every type is "Assumed contract" even where its comment does not repeat it.
import type { Id, IsoDateTime, Money } from '@/lib/api';
import type { ServiceType } from '@/features/orders';

/*
 * Units used below: money is a 4-decimal string; rates are percentages from 0 to 100; durations say their unit in the field
 * name (`...Seconds`, `p50Ms`, `runwayDays`); dates are ISO strings, except chart buckets, which are a calendar day
 * `YYYY-MM-DD` or a month `YYYY-MM`.
 */

/** Which orders the figures cover. The map names `scope`: everything, merchants' orders (API and portal) or the storefront's. */
export type DashboardScope = 'all' | 'b2b' | 'b2c';

/**
 * The period of the stat strip, the top lists and the attention facts, in days: 24 hours, 7 or 14 days.
 * Assumed contract: the `days` query parameter of `GET /admin/dashboard`.
 */
export type DashboardDays = 1 | 7 | 14;

/** What the dashboard is asked for. */
export type DashboardParams = { scope: DashboardScope; days: DashboardDays };

/**
 * The figures of one period. `previous` in `Dashboard.stats` is the period of the same length just before.
 * `successRate` is completed divided by completed plus rejected, in percent; both rates and times are `null` when
 * the period has no order to measure.
 * Assumed contract.
 */
export type PeriodStats = {
  revenue: Money;
  profit: Money;
  orders: number;
  successRate: number | null;
  medianTurnaroundSeconds: number | null;
};

/** How urgent an attention item is. The server decides, the console only draws the badge. Assumed contract. */
export type AttentionSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * One thing that needs a person, as facts. The server decides which items exist, how severe they are and their order
 * (most urgent first); the console writes the sentence and picks the button (`lib/attention.ts`). An item with a `kind`
 * this console does not know (a newer server) still shows, with its severity and a neutral title.
 * Assumed contract.
 */
export type AttentionItem = { id: string; severity: AttentionSeverity } & (
  | {
      kind: 'orders_past_sla';
      count: number;
      oldestOrderId: Id;
      overdueSeconds: number;
      targetSeconds: number;
    }
  | { kind: 'orders_review'; count: number; topReason: string | null; topReasonCount: number }
  | {
      kind: 'supplier_down' | 'supplier_degraded';
      supplierId: Id;
      supplierName: string;
      successRate: number | null;
      openOrders: number;
    }
  | {
      kind: 'supplier_balance_low';
      supplierId: Id;
      supplierName: string;
      balance: Money;
      minimum: Money;
      runwayDays: number | null;
    }
  | { kind: 'services_below_floor'; count: number; serviceNames: string[] }
  | { kind: 'deposits_pending'; count: number; total: Money; oldestAt: IsoDateTime }
  | { kind: 'wallets_negative'; count: number; clients: { id: Id; name: string; balance: Money }[] }
  | { kind: 'merchants_pending'; count: number; names: string[] }
  | { kind: 'commissions_accrued'; count: number; total: Money; agents: number }
  | { kind: 'orders_held'; count: number; captured: Money; oldestAt: IsoDateTime }
  | { kind: 'disputes_due'; count: number; firstDisputeId: Id; dueAt: IsoDateTime; amount: Money; fee: Money }
  | { kind: 'tickets_late'; count: number; oldestTicketId: Id; waitingSince: IsoDateTime; subject: string }
  | { kind: 'refunds_requested'; count: number; total: Money }
  | { kind: 'refunds_failed'; count: number; firstRefundId: Id; reason: string }
  | { kind: 'fx_stale'; currencies: string[]; oldestUpdatedAt: IsoDateTime }
);

/** The open orders of one service type, split the way the queue bar is drawn. `oldestCreatedAt` is `null` for an empty queue. Assumed contract. */
export type QueueByType = {
  type: ServiceType;
  open: number;
  review: number;
  pastSla: number;
  oldestCreatedAt: IsoDateTime | null;
};

/** One supplier's health over the last hour and its prepaid balance. `lowBalance` is the server's call. Assumed contract. */
export type SupplierHealth = {
  id: Id;
  name: string;
  enabled: boolean;
  health: 'up' | 'degraded' | 'down';
  successRate1h: number | null;
  p50Ms: number | null;
  balance: Money;
  lowBalance: boolean;
};

/** Orders created in one bucket, by service type. */
export type TypeCounts = { imei: number; server: number; remote: number; file: number };

/**
 * Orders created per service type: the last 30 calendar days (oldest first) and the last 12 months (oldest first).
 * `monthly` is `null` when there is no yearly history for the scope (the storefront has none yet).
 * Assumed contract.
 */
export type OrdersByType = {
  daily: ({ date: string } & TypeCounts)[];
  monthly: ({ month: string } & TypeCounts)[] | null;
};

/**
 * Completed-order revenue before VAT, merchants against the storefront: 30 days (oldest first) and the totals the legend
 * shows. Only sent for `scope=all`. Assumed contract.
 */
export type ChannelRevenue = {
  daily: { date: string; b2b: Money; b2c: Money }[];
  totals: {
    last7Days: { b2b: Money; b2c: Money };
    last30Days: { b2b: Money; b2c: Money };
  };
};

/**
 * The storefront's last 30 days, whatever the period: the funnel, and the figures under it. Rates are percentages and
 * `null` when there is nothing to divide by. Not sent for `scope=b2b`. Assumed contract.
 */
export type StorefrontSummary = {
  funnel: {
    visitorsEstimated: number;
    imeiChecks: number;
    checkoutsStarted: number;
    paid: number;
    delivered: number;
  };
  averageOrder: Money | null;
  refundRate: number | null;
  disputeRate: number | null;
  firstReplySeconds: number | null;
  satisfaction: { average: number; ratings: number } | null;
  heldForReview: number;
};

/** A storefront customer in the top five by spend over the period. Assumed contract. */
export type TopCustomer = { id: Id; name: string; country: string; orders: number; spend: Money };

/**
 * The numbers beside the sidebar items. They cover the whole console whatever the scope, so the sidebar can read them
 * from the default dashboard call. Assumed contract (a lighter counts route would be better, see HANDOFF.md).
 */
export type DashboardNavCounts = {
  orders: { open: number; pastSla: number };
  finance: { pendingDeposits: number };
  merchants: { pendingApproval: number };
  support: { open: number; late: number };
  refunds: { open: number; disputesDueSoon: number };
  risk: { held: number };
};

/**
 * Everything the dashboard shows, from `GET /admin/dashboard` (assumed contract). `attention` is the whole list, ranked by
 * the server; the console shows six and a "Show more" button. A section the scope does not use is `null`.
 */
export type Dashboard = {
  generatedAt: IsoDateTime;
  stats: { current: PeriodStats; previous: PeriodStats | null };
  attention: AttentionItem[];
  queues: QueueByType[];
  suppliers: SupplierHealth[];
  ordersByType: OrdersByType;
  revenueByChannel: ChannelRevenue | null;
  storefront: StorefrontSummary | null;
  topCustomers: TopCustomer[] | null;
  navCounts: DashboardNavCounts;
};

/** What the top merchants list is asked for (assumed contract: the query parameters `days` and `limit`). */
export type TopClientsParams = { days: DashboardDays; limit: number };

/**
 * A merchant in the top list of `GET /admin/reports/top-clients` (assumed contract). The list is ranked by `spend`,
 * highest first; `walletBalance` can be negative.
 */
export type TopClient = {
  id: Id;
  name: string;
  country: string;
  orders: number;
  spend: Money;
  profit: Money;
  walletBalance: Money;
};
