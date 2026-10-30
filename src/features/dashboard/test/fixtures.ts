// Fixed dashboard payloads for tests that need exact numbers: the dev mock's figures move with the clock, these do not.
// `dashboardFixture()` is a complete, busy payload; pass overrides for the case under test. Import from tests only.
import type { AttentionItem, Dashboard, DashboardNavCounts, TypeCounts } from '../types';

/** The moment the fixtures are "generated": days in the charts end here. */
export const FIXTURE_NOW = '2026-10-30T10:00:00.000Z';

const DAY_MS = 86_400_000;

// 30 or 12 buckets ending at the fixture date, oldest first, with counts that vary a little.
const daily = (): ({ date: string } & TypeCounts)[] =>
  Array.from({ length: 30 }, (_, index) => ({
    date: new Date(Date.parse(FIXTURE_NOW) - (29 - index) * DAY_MS).toISOString().slice(0, 10),
    imei: 4 + (index % 3),
    server: 1,
    remote: index % 2,
    file: 1,
  }));

const monthly = (): ({ month: string } & TypeCounts)[] =>
  Array.from({ length: 12 }, (_, index) => ({
    month: `${index < 2 ? 2025 : 2026}-${String(((index + 10) % 12) + 1).padStart(2, '0')}`,
    imei: 100 + index,
    server: 30,
    remote: 20,
    file: 10,
  }));

export const NAV_COUNTS: DashboardNavCounts = {
  orders: { open: 12, pastSla: 3 },
  finance: { pendingDeposits: 2 },
  merchants: { pendingApproval: 1 },
  support: { open: 7, late: 2 },
  refunds: { open: 5, disputesDueSoon: 1 },
  risk: { held: 4 },
};

/** One item of every kind the console knows, most urgent first. */
export const ATTENTION_SAMPLES: AttentionItem[] = [
  {
    id: 'sla',
    severity: 'critical',
    kind: 'orders_past_sla',
    count: 3,
    oldestOrderId: 48784,
    overdueSeconds: 720,
    targetSeconds: 120,
  },
  {
    id: 'sup-2',
    severity: 'critical',
    kind: 'supplier_down',
    supplierId: 2,
    supplierName: 'Gulf Server Hub',
    successRate: 41.6,
    openOrders: 7,
  },
  {
    id: 'review',
    severity: 'high',
    kind: 'orders_review',
    count: 5,
    topReason: 'Supplier timed out after 3 attempts',
    topReasonCount: 3,
  },
  {
    id: 'floor',
    severity: 'high',
    kind: 'services_below_floor',
    count: 1,
    serviceNames: ['Chimera Tool 1 Month'],
  },
  {
    id: 'bal-2',
    severity: 'medium',
    kind: 'supplier_balance_low',
    supplierId: 2,
    supplierName: 'Gulf Server Hub',
    balance: '38.4000',
    minimum: '150.0000',
    runwayDays: 0.6,
  },
  {
    id: 'pay',
    severity: 'medium',
    kind: 'deposits_pending',
    count: 2,
    total: '720.0000',
    oldestAt: '2026-10-30T07:00:00.000Z',
  },
  {
    id: 'neg',
    severity: 'medium',
    kind: 'wallets_negative',
    count: 1,
    clients: [{ id: 17, name: 'Muscat Mobile Clinic', balance: '-81.9500' }],
  },
  {
    id: 'risk',
    severity: 'high',
    kind: 'orders_held',
    count: 4,
    captured: '82.9600',
    oldestAt: '2026-10-25T10:00:00.000Z',
  },
  {
    id: 'disp',
    severity: 'critical',
    kind: 'disputes_due',
    count: 2,
    firstDisputeId: 2005,
    dueAt: '2026-11-01T13:00:00.000Z',
    amount: '15.5900',
    fee: '15.0000',
  },
  {
    id: 'tk',
    severity: 'medium',
    kind: 'tickets_late',
    count: 2,
    oldestTicketId: 4202,
    waitingSince: '2026-10-30T05:00:00.000Z',
    subject: 'Phone still locked after unlock',
  },
  { id: 'rfq', severity: 'medium', kind: 'refunds_requested', count: 1, total: '19.9900' },
  {
    id: 'rff',
    severity: 'high',
    kind: 'refunds_failed',
    count: 2,
    firstRefundId: 1011,
    reason: 'Gateway timeout',
  },
  {
    id: 'fx',
    severity: 'medium',
    kind: 'fx_stale',
    currencies: ['SEK', 'CAD'],
    oldestUpdatedAt: '2026-10-29T04:00:00.000Z',
  },
  {
    id: 'pend',
    severity: 'low',
    kind: 'merchants_pending',
    count: 2,
    names: ['Aqaba Gadgets', 'Doha Unlock'],
  },
  { id: 'comm', severity: 'low', kind: 'commissions_accrued', count: 4, total: '12.3400', agents: 2 },
];

/** A complete payload for the All channels view. */
export function dashboardFixture(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    generatedAt: FIXTURE_NOW,
    stats: {
      current: {
        revenue: '1500.0000',
        profit: '300.0000',
        orders: 40,
        successRate: 95,
        medianTurnaroundSeconds: 600,
      },
      previous: {
        revenue: '1000.0000',
        profit: '350.0000',
        orders: 40,
        successRate: 90,
        medianTurnaroundSeconds: 900,
      },
    },
    attention: ATTENTION_SAMPLES.slice(0, 3),
    queues: [
      { type: 'imei', open: 20, review: 4, pastSla: 2, oldestCreatedAt: '2026-10-30T07:40:00.000Z' },
      { type: 'server', open: 5, review: 0, pastSla: 0, oldestCreatedAt: '2026-10-30T09:00:00.000Z' },
      { type: 'remote', open: 0, review: 0, pastSla: 0, oldestCreatedAt: null },
      { type: 'file', open: 3, review: 1, pastSla: 1, oldestCreatedAt: '2026-10-29T10:00:00.000Z' },
    ],
    suppliers: [
      {
        id: 1,
        name: 'Nordic GSM',
        enabled: true,
        health: 'up',
        successRate1h: 97.8,
        p50Ms: 250,
        balance: '1850.0000',
        lowBalance: false,
      },
      {
        id: 2,
        name: 'Gulf Server Hub',
        enabled: true,
        health: 'down',
        successRate1h: 41.6,
        p50Ms: 1800,
        balance: '38.4000',
        lowBalance: true,
      },
      {
        id: 3,
        name: 'Rapid IMEI',
        enabled: true,
        health: 'degraded',
        successRate1h: null,
        p50Ms: null,
        balance: '640.0000',
        lowBalance: false,
      },
      {
        id: 4,
        name: 'Old Feed',
        enabled: false,
        health: 'up',
        successRate1h: 99,
        p50Ms: 300,
        balance: '10.0000',
        lowBalance: false,
      },
    ],
    ordersByType: { daily: daily(), monthly: monthly() },
    revenueByChannel: {
      daily: daily().map((day, index) => ({
        date: day.date,
        b2b: `${100 + index}.0000`,
        b2c: `${20 + index}.0000`,
      })),
      totals: {
        last7Days: { b2b: '700.0000', b2c: '300.0000' },
        last30Days: { b2b: '3000.0000', b2c: '1000.0000' },
      },
    },
    storefront: {
      funnel: { visitorsEstimated: 5000, imeiChecks: 900, checkoutsStarted: 300, paid: 104, delivered: 98 },
      averageOrder: '18.5000',
      refundRate: 2.4,
      disputeRate: 1.25,
      firstReplySeconds: 1800,
      satisfaction: { average: 4.6, ratings: 12 },
      heldForReview: 4,
    },
    topCustomers: [
      { id: 7, name: 'Daniel Whitmore', country: 'GB', orders: 5, spend: '99.0000' },
      { id: 9, name: 'Sara Lindqvist', country: 'SE', orders: 3, spend: '41.5000' },
    ],
    navCounts: NAV_COUNTS,
    ...overrides,
  };
}
