Feature brief: **dashboard**. Read `/home/saifi/gsm-project/frontend-admin/docs/briefs/_common.md` first (worktree, rules, checks, HANDOFF.md); your worktree is `/home/saifi/gsm-project/worktrees/dashboard`, your slice `/home/saifi/gsm-project/frontend-admin/docs/slices/dashboard.json`.

# Feature: dashboard (`/dashboard`, page permission `dashboard:read`)
Demo: `/home/saifi/gsm-project/frontend-admin/reference/gsm-admin/src/js/40-p-dashboard.js` (139 lines, read it all). Helpers it uses: `11-state.js` (statsFor, periodStats, daily, dailyRevenue, queueByType, supMetrics, merStats, attention), `12-state-b2c.js` (attentionB2C, supportStats, heldOrders, staleCurrencies), `90-app.js` renderNav `badges`. Demo defaults: period 7, chartRange 30D, chartView chart, scope all. Drop demo-only bits: `modeGate`, `ui.mode==='empty'` branches (real empty states come from real data), "Simulate…" buttons (MISMATCHES M9).

## Routes (all three get an exported function with JSDoc what+why and `@route`, in `src/features/dashboard/api/`)
- `GET /admin/dashboard` (dashboard:read): `getDashboard({ scope, days }, signal)`; query `scope=all|b2b|b2c` (map) and `days=1|7|14` (assumed).
- `GET /admin/reports/top-clients` (reports:read): `getTopClients({ days, limit: 6 }, signal)` returns `TopClient[]` (assumed query `days`, `limit`).
- `GET /admin/queues` (queues:read): Bull Board UI, NOT fetched (MISMATCHES M8). `queuesBoardUrl()` returns `apiUrl('/admin/queues')`; shown as an external link "Queue monitor" (new tab, `rel="noopener noreferrer"`) in the queue panel header, only for staff with `queues:read`.
Check: `node scripts/check-route-coverage.mjs --feature dashboard` must print 3/3.

## Assumed contract (the map has no DTO). Put these types in `src/features/dashboard/types/`, mark them "Assumed contract" in JSDoc. Money = 4-decimal string (`Money` from `@/lib/api`), dates ISO strings.
```ts
type DashboardScope = 'all' | 'b2b' | 'b2c';
type DashboardDays = 1 | 7 | 14;
type PeriodStats = { revenue: Money; profit: Money; orders: number; successRate: number | null; medianTurnaroundSeconds: number | null };
type AttentionSeverity = 'critical' | 'high' | 'medium' | 'low';
type AttentionItem = { id: string; severity: AttentionSeverity } & (
  | { kind: 'orders_past_sla'; count: number; oldestOrderId: number; overdueSeconds: number; targetSeconds: number }
  | { kind: 'orders_review'; count: number; topReason: string | null; topReasonCount: number }
  | { kind: 'supplier_down' | 'supplier_degraded'; supplierId: number; supplierName: string; successRate: number | null; openOrders: number }
  | { kind: 'supplier_balance_low'; supplierId: number; supplierName: string; balance: Money; minimum: Money; runwayDays: number | null }
  | { kind: 'services_below_floor'; count: number; serviceNames: string[] }
  | { kind: 'deposits_pending'; count: number; total: Money; oldestAt: string }
  | { kind: 'wallets_negative'; count: number; clients: { id: number; name: string; balance: Money }[] }
  | { kind: 'merchants_pending'; count: number; names: string[] }
  | { kind: 'commissions_accrued'; count: number; total: Money; agents: number }
  | { kind: 'orders_held'; count: number; captured: Money; oldestAt: string }
  | { kind: 'disputes_due'; count: number; firstDisputeId: number; dueAt: string; amount: Money; fee: Money }
  | { kind: 'tickets_late'; count: number; oldestTicketId: number; waitingSince: string; subject: string }
  | { kind: 'refunds_requested'; count: number; total: Money }
  | { kind: 'refunds_failed'; count: number; firstRefundId: number; reason: string }
  | { kind: 'fx_stale'; currencies: string[]; oldestUpdatedAt: string });
type QueueByType = { type: ServiceType; open: number; review: number; pastSla: number; oldestCreatedAt: string | null };
type SupplierHealth = { id: number; name: string; enabled: boolean; health: 'up' | 'degraded' | 'down'; successRate1h: number | null; p50Ms: number | null; balance: Money; lowBalance: boolean };
type TypeCounts = { imei: number; server: number; remote: number; file: number };
type OrdersByType = { daily: ({ date: string } & TypeCounts)[] /* last 30 days, oldest first */; monthly: ({ month: string } & TypeCounts)[] | null /* 12 months; null = no yearly history */ };
type ChannelRevenue = { daily: { date: string; b2b: Money; b2c: Money }[] /* 30 days, before VAT */; totals: { last7Days: { b2b: Money; b2c: Money }; last30Days: { b2b: Money; b2c: Money } } };
type StorefrontSummary = { funnel: { visitorsEstimated: number; imeiChecks: number; checkoutsStarted: number; paid: number; delivered: number }; averageOrder: Money | null; refundRate: number | null; disputeRate: number | null; firstReplySeconds: number | null; satisfaction: { average: number; ratings: number } | null; heldForReview: number };
type TopCustomer = { id: number; name: string; country: string; orders: number; spend: Money };
type DashboardNavCounts = { orders: { open: number; pastSla: number }; finance: { pendingDeposits: number }; merchants: { pendingApproval: number }; support: { open: number; late: number }; refunds: { open: number; disputesDueSoon: number }; risk: { held: number } };
type Dashboard = { generatedAt: string; stats: { current: PeriodStats; previous: PeriodStats | null }; attention: AttentionItem[] /* server-ranked, most urgent first, all of them */; queues: QueueByType[]; suppliers: SupplierHealth[]; ordersByType: OrdersByType; revenueByChannel: ChannelRevenue | null /* scope=all only */; storefront: StorefrontSummary | null /* null for b2b */; topCustomers: TopCustomer[] | null /* null for b2b, top 5 by spend in the period */; navCounts: DashboardNavCounts /* whole console, any scope */ };
type TopClient = { id: number; name: string; country: string; orders: number; spend: Money; profit: Money; walletBalance: Money };
```
The server decides which attention items exist, their severity and order (business rules stay on the server). The client only writes the demo's copy from the facts. An item with an unknown `kind` (newer server) still shows: its severity badge, the title "Needs attention", no button.

## Screen (follow the demo's markup, classes and copy)
- Header: title, sub `"{weekday day month}. Showing {all channels|merchants|the storefront}. Figures cover orders created in the selected period."`, segmented Channel (All/Merchants/Storefront) and Period (24h/7D/14D). State in the URL: `scope`, `days`, `range` (7D|30D|12M), `view` (chart|table); defaults left out of the address; bad values fall back to defaults.
- Stat strip (5 cells, demo grid incl. the 5th cell spanning 2 on mobile): Revenue, Gross profit, Orders, Success rate, Median turnaround, with the demo's `delta()` (pts for success rate, lowerBetter for turnaround, "No earlier data" when previous is null/0, sr-only better/worse). Info buttons open the demo's note (use the kit's `InfoTip`). Display-only maths on money via `toAmount` from `@/lib/format`; never sum money strings yourself for display totals the server already sends.
- Left column: Needs attention (cap 6, "Show n more"/"Show fewer" with aria-expanded/aria-controls, focus stays on the toggle; "All clear" empty state), Orders by type (stacked bars from `@/components/charts`, range + view segmented controls, `SeriesTable` view; 12M with `monthly: null` shows 30D with the demo's note "The storefront has no yearly history yet, so this shows 30 days."; drop the demo's "older months are synthetic" and "Storefront orders … included in the latest month" notes, they describe fake data), Revenue by channel (scope all only; 7 days when range is 7D else 30; legend totals from `totals`, storefront share %), Storefront funnel (scope ≠ b2b).
- Right column: Open queue by type (rows link to orders), Supplier health (table; Disabled/Healthy/Degraded/Down badges as `supBadge`; low balance in warn colour with icon), Top merchants (scope ≠ b2c, from top-clients; hidden without `reports:read`; negative wallet in crit colour), Top customers (scope ≠ b2b).
- Loading: skeletons per panel (kit has `SkeletonStat`, `Skeleton`, `SkeletonTable`). Error: `ErrorState` with Retry, showing the server's problem text. Keep previous data while a new scope/period loads (global `placeholderData` already does that), dim the panels like the demo's chart frame.

## Links (use real `<a>`/router links, not clickable `<tr>` only; keep rows keyboard reachable)
- Orders: use `ordersListPath(patch)` and the `OrderFilters` type from `@/features/orders` (already exported). Queue row: `{ type, channel }` where channel = scope b2b→'b2b', b2c→'b2c', all→''. orders_past_sla: `{ pastSla: true, channel }`. orders_review: `{ tab: 'review' }`.
- Other pages are not built yet; use exactly these addresses (listed in `docs/ARCHITECTURE.md` §5.2, later features honour them): `/suppliers?supplier=<id>`, `/services?belowFloor=true`, `/finance?tab=payments`, `/merchants?tab=pending`, `/merchants/<id>`, `/customers/<id>`, `/commissions`, `/risk`, `/refunds?tab=disputes`, `/refunds?tab=refunds&status=requested|failed`, `/support?filter=late`, `/settings?tab=tax`.
- CTA per kind: demo copy. supplier_balance_low: the demo's "Record top-up" has no route in the map (balance comes from the supplier sync), so it becomes "Open supplier" → `/suppliers?supplier=<id>` (log mismatch). Withdrawals item: dropped (no admin route, MISMATCHES M3).
- Show a link/CTA only when the staff member may open the target page: `useCanOpenPage(name)` from `@/lib/auth/useCanOpenPage` (already there) returns `boolean | undefined`. Without access the row stays, without a button.

## Sidebar counts (through the manifest)
Export `useDashboardNavCounts()` and set it as `useNavCounts` in `manifest.ts` (type `NavCounts` from `@/app/layout/useNavCounts`; the shell calls it on every page). It calls the same query as the page with `scope: 'all', days: 7` (so the dashboard page shares it), `enabled` only when `me.permissions` grant `dashboard:read` (`hasPermission` from `@/lib/auth/permissions`, `useMe` from `@/features/auth`), `refetchInterval: 60_000`. Map: orders {count open, late pastSla}, finance {pendingDeposits}, merchants {pendingApproval}, support {open, late, lateLabel 'past the reply target'}, refunds {open, late disputesDueSoon, lateLabel 'dispute deadlines within 3 days'}, risk {held}; zero counts are omitted. The query key is `[...DASHBOARD_KEY, { scope, days }]` with `DASHBOARD_KEY` from `@/lib/query` (orders actions already invalidate it).

## Mocks (dev only, inside the feature: `src/features/dashboard/mocks/`)
Compute the DTO from the live mock stores where they exist (`@/mocks/orders` order store, `@/mocks/ledger`) and from the demo seed otherwise (`loadDemoState` from `@/mocks/seed`), porting the demo helpers listed above (split files ≤ ~200 lines); handlers for both GET routes (honour `scope`, `days`, `limit`); export `mocks` from `mocks/index.ts`. The mock may port demo business rules: it plays the server.

## Tests (Vitest + Testing Library + MSW; helpers in `src/test/renderApp.ts`, see `src/features/orders/pages/OrdersPage.test.tsx`)
api (query building), lib (delta, attention copy for every kind incl. unknown, link building), page (scope hides/shows panels, period refetches, range/view toggles, show-more, empty/All clear, error + Retry, no `reports:read` → no Top merchants, no `queues:read` → no Queue monitor link, a CTA without page access has no button), nav counts in the sidebar (AppShell-level test).

## Bookkeeping
- `manifest.ts`: page `{ name: 'dashboard', heading: 'Dashboard', list: () => import('./pages').then((m) => m.DashboardPage) }`, `useNavCounts`. No registry (no CRUD resource).
- `HANDOFF.md` mismatch rows (DASHBOARD-1…), at least: assumed dashboard DTO and the `days` param; attention as typed facts with copy in the client; supplier top-up → Open supplier; demo chart notes about synthetic history dropped; storefront funnel carried by the dashboard payload (the checkouts page will use `GET /admin/reports/funnel`); nav counts from the dashboard payload (no counts route; a lighter one would be better).
- Checks as in `_common.md` + coverage 3/3.

Reply (≤200 words): files changed, assumed contracts beyond this brief, mismatches logged, decisions to review, anything not done.
