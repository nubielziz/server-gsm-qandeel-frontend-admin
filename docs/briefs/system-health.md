# Brief: system-health (foundation + 7 tab slices)

Read `docs/briefs/_common.md` first; this brief wins where they differ. Design source (no demo page):
`docs/system-health-design.md`. Contract (do not change; ask through HANDOFF): `src/features/system-health/types/`.
Routes: `docs/slices/system-health.json` (22 rows, 30 endpoints). Feature folder: `src/features/system-health`.
Screens follow `reference/gsm-admin/DESIGN.md` and the kit in `@/components/ui` (look at its `index.ts`).

## Differences from the common brief

- One feature, built in slices. The foundation runs in the main checkout (`/home/saifi/gsm-project/frontend-admin`)
  because the lead edits shared files beside it; each tab runs in its own worktree
  `/home/saifi/gsm-project/worktrees/system-health-<tab>` (branch `feat/system-health-<tab>`) and edits only
  `src/features/system-health/tabs/<tab>/**` there. Needs outside that folder (types, hooks, mocks, shared components)
  go to `src/features/system-health/tabs/<tab>/HANDOFF.md` under SHARED-NEEDS, with a local workaround.
- Coverage check: `node scripts/check-route-coverage.mjs --feature system-health`.
- Server is the authority: never compare a value with a threshold, never decide a status. Show `Measure.state`,
  `status`, `health` as sent. "Problems first" sorting by the server's state is presentation and allowed.
- No data is not healthy: a null value, `unknown` state, missing series or a failed call is neutral ("No data",
  "Monitoring unavailable", "Status unavailable"), never green.
- Status is never colour alone: icon + word + tone (`Badge`, `StatusDot` with a label). Status tones are never
  series colours; single-series charts use `s1`.
- Copy: sentence case, units always visible (`ms`, `%`, `/min`), tabular numerals in tables, mono for ids, codes,
  queue and job names, hosts, request ids, commits.

## Folder layout

```
types/        lead (contract)                      lib/          F-shell: measure and status words, links, ranges
api/          F-data: one function per endpoint     components/   F-shell: shared status pieces (below)
hooks/        F-data: queries, mutations, grants    header/       F-shell: header, verdict, KPI row, maintenance
mocks/        F-mocks: scenarios and handlers       pages/        F-shell: SystemHealthPage (composes only)
tabs/<tab>/   one slice each (overview, api, orders, queues, alerts, stores, integrity)
test/         F-shell: page-test helpers             manifest.ts, index.ts: F-shell (lead made a stub)
```

## Hook contract (F-data writes it; everyone else uses it)

Query keys start `['api', 'system-health', <name>, …params]` (export `HEALTH_KEY`). Queries use `useApiQuery`, keep
the previous data while a new key loads (`placeholderData: keepPreviousData`) and poll with `refetchInterval`
(export `POLL = { fast: 15_000, normal: 30_000, running: 5_000 }`); React Query already pauses polling in hidden
tabs, so do not set `refetchIntervalInBackground`.

| Hook | Returns | Poll |
|---|---|---|
| `useSystemHealth()` | `SystemHealth` | fast |
| `useChecks(q: ChecksQuery)` | `ChecksResponse` | normal |
| `useApiMetrics(q: MetricsQuery)`, `useApiErrors(q: ErrorsQuery)` | `ApiMetrics`, `ErrorsResponse` | normal |
| `useOrdersHealth()`, `useSuppliersHealth()` | `OrdersHealth`, `SuppliersHealth` | normal |
| `useQueues()` | `QueuesResponse` | fast |
| `useFailedJobs(queue?: string, page = { start, end })` | `ListResult<FailedJob>` (disabled without queue) | normal |
| `useJobs(q?: JobsQuery)`, `useWebhooksHealth()` | `JobsResponse`, `WebhooksHealth` | normal |
| `useDatabaseHealth()`, `useCacheHealth()` | `DatabaseHealth`, `CacheHealth` | normal |
| `useIntegrity()` | `IntegrityReport` | normal; running while `data.running` |
| `useAlerts(filters: AlertFilters, page)`, `useAlert(id?)` | `ListResult<AlertEvent>`, `AlertEvent` | fast |
| `useAlertRules(page)`, `useIncidents(filters: IncidentFilters, page)`, `useIncident(id?)` | lists / `Incident` | normal |

Mutations (`useApiMutation`, success toast that states what changed, invalidate the keys they change). **Every
mutation hook takes a required `{ toastErrors: boolean }`**: pass `false` when a dialog answers the write (the
dialog shows the server's error with `dialogSubmit`/`FormDialog`/`ConfirmDialog`; a toast would repeat it), `true`
for a control without a dialog (rule `Switch`, Unmute), so a refusal is never silent. Hooks:
`useSetMaintenance(o)` (`SetMaintenanceBody`), `useRetryFailedJobs(o)` (`{ queue, body }`), `usePauseQueue(o)`
(`{ queue, body }`), `useRunJob(o)` (`{ job, label? }`), `useRunIntegrity(o)`, `useAckAlert(o)` (`{ id, body }`),
`useCreateAlertRule(o)`, `useUpdateAlertRule(o)` (`{ id, body }`), `useDeleteAlertRule(o)` (`id`),
`useCreateIncident(o)`, `useUpdateIncident(o)` (`{ id, body }`), `useSetSupplierStatus(o)` (`{ id, name, status:
'paused' | 'active' }`, calls `updateSupplier` from `@/features/suppliers`, also invalidates Refine resource
`suppliers`). Read hooks take a last optional `enabled = true` (MISMATCHES M207). Other hooks: `useHealthGrants()` (`{ ready, can, needs, readOnly }`, like
`src/features/merchants/hooks/useMerchantGrants.ts`; `readOnly` = loaded and none of `system:manage`,
`alerts:create|update|delete`, `incidents:create|update`, `suppliers:update`), `useHealthRange()` (`[range,
setRange]` from `?range=`, default `24h`), `useRefreshHealth()` (refetches every active health query at once and
resolves when done), `isMonitoringUnavailable(error)` (503 with code `MONITORING_UNAVAILABLE`).

## Shared components (F-shell writes them; tabs use them, never re-implement them)

- `HealthBadge` — `{ status: OverallStatus | CheckStatus | MetricState | 'paused' }`: tone + icon + word.
- `MeasureValue` — prints a `Measure` with its unit ("412 ms", "0.42 %", "1,240 /min", "3m 12s", "1.2 GB"), a
  small state icon for warn/crit/unknown with an sr-only state word, "No data" for null; optional threshold line
  ("warn 800 ms").
- `HealthCard` — a `Panel` around one query: title, sub, right slot; handles loading (skeleton prop), refetching
  (keeps content), empty, unavailable, error (`ErrorState` with request id and Retry), stale badge
  ("Stale · updated 2m ago"), forbidden. Children render only with data. Every card in every tab uses it.
- `Freshness` — "Updated 8s ago" ticking each second, "Stale" after two intervals.
- `UptimeBars` — one cell per `CheckBucket` (ok/degraded/down in status dots, unknown as a hairline outline),
  tooltip and arrow keys, accessible name, and a table view.
- `ChartCard` body piece — `LineChart` with the server's threshold (`reference` from `Measure.crit ?? warn`,
  `bad` from `direction`), null points as gaps, a "Table view" toggle that shows the points as a table.
- `DeepLink` — `{ to: 'grafana' | 'sentry' | 'bullBoard', path? }`: renders nothing unless the env URL is set.
- `ActionButton` — gated by `useHealthGrants`: hidden when `readOnly`, disabled with the reason as title and
  `aria-describedby` when the one permission is missing.
- `ResponsiveTable` — a `DataTable` from `md` up, the same rows as stacked cards below `md` (label: value rows,
  actions at the card foot). Wide tables in every tab use it.

## Slices

### F-data — `api/` and `hooks/` (main checkout)
One exported function per endpoint (30), typed, JSDoc what + why + `@route METHOD /path` (exact slice path), marked
"Assumed contract". Files by area (`health.ts`, `traffic.ts`, `pipeline.ts`, `queues.ts`, `jobs.ts`, `stores.ts`,
`integrity.ts`, `maintenance.ts`, `alerts.ts`, `alertRules.ts`, `incidents.ts`) and `api/index.ts`. Lists
(`/admin/alerts`, `/admin/alert-rules`, `/admin/incidents`, `…/queues/:name/failed`) use `apiList` with
`ListQuery`; register the three CRUD resources (`alerts`, `alert-rules`, `incidents`) in `api/resources.ts` and add
`registry` to the manifest. Then the hooks above (`hooks/index.ts` exports them). Tests: api functions hit the right
method, path and query (see `src/features/audit/api/auditLogs.test.ts`), grants, range hook, one mutation with its
invalidation. Do not touch `mocks/`, `components/`, `header/`, `pages/`, `tabs/`.

### F-mocks — `mocks/` (main checkout)
Every endpoint for every scenario of `mockScenario()` (`@/mocks/scenario`): `healthy`, `degraded`, `outage`,
`monitoring-down`, `partial-failure`, `maintenance`, `readonly` (see the design brief's last section and
`reference/gsm-map/data/system.mjs` scenarios `system-alert` and `system-integrity`). Plausible, deterministic time
series (seeded by name and bucket, anchored to the current time so polls move a little; null gaps where data is
missing; `degraded` slows one supplier for the last ~40 minutes). Thresholds and states as in the design brief's KPI
table (the mock plays the server, so it computes states). Supplier rows come from the suppliers mock store
(`suppliersState()` of `@/features/suppliers/mocks`, so a pause made with `PATCH /admin/suppliers/:id` shows up).
Stateful writes (ack, rules CRUD with 422 field errors, incidents with a timeline the mock writes, closing needs
`rootCause`, queue pause needs `reason`, retry, run job, integrity run that finishes after a few seconds,
maintenance). In `readonly`, every write answers 403 `FORBIDDEN`. `monitoring-down`: metrics and errors answer 503
`MONITORING_UNAVAILABLE`; health says monitoring unavailable and status `unknown`. `partial-failure`: only
`GET /admin/system/queues` answers 500. `outage`: orders-health and integrity answer 503 `DATABASE_UNAVAILABLE`.
Stores reseed when the scenario changes; `reset` restores them. `mocks/index.ts` exports `mocks: FeatureMocks`.
Tests: each scenario's health status, the 503/500 cases, a write in `readonly`, ack and pause round trips.
Do not touch anything outside `mocks/`.

### F-shell — page, header, KPI row, shared components (main checkout, after F-data)
`pages/SystemHealthPage.tsx` composes: header (h1 "System health", `Freshness` of the health query, range
`SegmentedControl` 1h/6h/24h/7d, Refresh button with a busy state, Maintenance button, Grafana `DeepLink`), the
verdict panel (tone by status; since + duration; broken components worst first; open alerts and incidents with links
to the Alerts tab; impact line from `useOrdersHealth` with its own failure text "Order impact unavailable"; an
`aria-live="polite"` region that announces status changes), the KPI row (one `Panel`, six cells, 2 columns below
`md`, 3 at `md`, 6 at `xl`; each cell its own query state, `Sparkline` trend, `HealthBadge` state, threshold text),
the read-only note, then `Tabs` from `?tab=` (hide tabs the staff member cannot read; scroll sideways on mobile) that
lazy-load `tabs/<tab>/index.ts` (create the seven placeholders: an `EmptyState` "This tab is being built"). The
maintenance dialog (`FormDialog`): scope radio (store, checkout, API orders, all), message (required, shown to
customers), expected end (`datetime-local`, optional), the effect sentence, Turn off as a separate confirm. The shell
banner `header/MaintenanceBanner.tsx` (manifest `banner`): warn strip under the top bar on every page while
maintenance is on, only with `system:read`, sharing the health query, with "Manage" linking to the page. Update
`manifest.ts` (`banner`), `index.ts`, `pages/index.ts`. Tests: page renders per permission set, verdict tones
(including monitoring unavailable and a failed health call), KPI cell error isolation, maintenance dialog body,
read-only hides actions, banner shows on another page.

## Tab slices (each in its own worktree; build only inside `tabs/<tab>/`)

How a tab plugs in (the foundation is committed; read its code, do not change it):

- A tab is `tabs/<tab>/index.ts` exporting one component without props (`OverviewTab`, `ApiTab`, `OrdersTab`,
  `QueuesTab`, `AlertsTab`, `StoresTab`, `IntegrityTab`); `pages/tabComponents.ts` loads it lazily. Replace the
  placeholder `<Name>Tab.tsx` (stop using `../TabPlaceholder`) and keep the export name.
- Read the range with `useHealthRange()`, permissions with `useHealthGrants()`, your own parameters with
  `useSearchParams`. A change of tab keeps only `?range=`. The shell wraps each tab in `PartBoundary`; wrap
  independent sub-parts in it too (`../../header/PartBoundary`).
- Imports: shared pieces and `ActionButton` from `../../components`, helpers and `healthPath(tab, params)` from
  `../../lib`, hooks from `../../hooks`, types from `../../types`. Links into the page (`?component=`, `?view=`,
  `?incident=`, `?queue=`, `?job=`) come from the verdict and other tabs: honour them.
- Page tests: `setupHealthMocks()` from `../../mocks/testing` once at the top, then `openHealthPage({ scenario,
  permissions, route })` from `../../test/openHealthPage`; also in `test/`: `pageQueries.ts`, `recordRequests.ts`,
  `healthFixture.ts`, `stubFetch.ts`, `testKit.ts`. The router changes tab inside a transition: wait for the address.
- The mock (`mocks/`, see `docs/ASSUMED_CONTRACTS.md` § system-health) plays every scenario; read its notes there
  for keys, 422 fields and codes instead of guessing.

Every tab: cards in a 12-column grid on desktop that stack on mobile; every card is a `HealthCard`; problems first;
healthy items collapse into one quiet line with "Show"; wide tables use `ResponsiveTable`; actions use
`ActionButton` + a dialog that states the effect; results by toast; tests for the tab's pure helpers and its main
interactions (render against the mock API as above).

- **overview** — Components list (badge, name, kind, since, latency `MeasureValue`, uptime 24h/7d/30d, last failure
  text, `UptimeBars` from `useChecks({ range })`); response time card for the picked component (`?component=`,
  defaults to the worst one) with its threshold; open alerts and ongoing incidents (link to `?tab=alerts…`); build
  card (version, commit mono with copy, environment, deployed).
- **api** — Surfaces table (requests/min, p50, p95, p99, 4xx, 5xx, 429, p95 sparkline; worst state first); latency
  chart for the picked surface (`?surface=`, percentile `SegmentedControl` p50/p95/p99); 5xx chart; slowest 10
  endpoints (method, path mono, surface, p95, req/min); top errors (code mono, status, endpoint mono, count, first and
  last seen, request id mono with `CopyButton`, Sentry link only when `VITE_SENTRY_URL` is set). `monitoring-down`
  shows "Monitoring unavailable" cards, not errors.
- **orders** — Pipeline card: past SLA total + held money + by-status table linking to `ordersListPath` of
  `@/features/orders`, dispatch p95, needs attention, success/failure per service type, held by risk (link
  `/risk?tab=queue`). Suppliers card: health badge (paused shows Paused), last success, latency, error and timeout
  rates, circuit (closed/open/half open with icon and word), last sync, balance with its state, link
  `supplierPath(id)`; Pause / Resume via `useSetSupplierStatus` (`suppliers:update`).
- **queues** — Queues table (state, paused, waiting, active, delayed, failed, oldest, rate, workers; Pause/Resume with
  reason, Retry all failed, Bull Board link per queue); failed jobs of `?queue=` (paginated, Retry one); scheduled
  jobs (schedule mono + words, last run badge, duration, next run, Run now, History drawer `?job=` from
  `useJobs({ job })`); webhooks card (outgoing and incoming).
- **alerts** — Sub-views `?view=alerts|rules|incidents` (`SectionTabs`). Alerts: status filter (Firing,
  Acknowledged, Resolved, All), rows with severity, rule, subject, "23 % > 20 % for 3m", started, status, who
  acknowledged; Acknowledge (note) and Declare incident (prefilled). Rules: table with condition, severity, channels,
  enable `Switch`, mute until (dialog) / Unmute, Edit (`FormDialog`, field errors from the server), Delete (confirm);
  New rule. Incidents: list (severity, title, status, components, started, duration), Declare, drawer `?incident=`
  with summary, `Timeline`, Post update (status + text), Close (root cause required).
- **stores** — Postgres card (status, connections `Meter` used/max, pool wait, waiting clients, locks, replica lag or
  "No replica", size and growth, pending migrations list); slow queries (id mono, query mono truncated with copy,
  calls, mean, total); long transactions. Redis card (memory `Meter`, evictions/min, hit rate, clients, latency).
- **integrity** — Last run (status badge, when, duration, who or schedule) and Run check now (`system:manage`,
  polling while running); four checks with pass/fail/unknown, count, difference; findings table (ref mono, label,
  difference, age, last entry; accounts link to `/finance`); the note "This check only reads the ledger. Fix a
  difference with a reversing entry in Finance."

## Screenshots (every slice, before replying)

`bash /tmp/claude-1000/-home-saifi-gsm-project-frontend-admin/e3ed80a7-ab5c-45e2-8b7a-224f530f567c/scratchpad/shoot-tab.sh <checkout> <port> <out> --tab <tab> --scenarios <list>`
(port and out dir are in your task). It signs in, takes 1440×900 and 390×844 shots per scenario and writes
`console.txt` (console errors, failed requests, sideways scroll). Look at your shots and fix what is clearly broken
(overlap, clipping, sideways scroll, green where there is no data, console errors). The reviewer looks at them too.
