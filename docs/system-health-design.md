# System health: design brief

New page `/system-health` (feature `system-health`, route group `health`, 22 rows / 30 endpoints). The demo has no such
screen; this brief is the design source. Console tokens and `reference/gsm-admin/DESIGN.md` win over any other guide.
Contract shapes: `src/features/system-health/types/` (assumed; listed in `docs/ASSUMED_CONTRACTS.md`).

**Job.** In three seconds: is everything OK now? If not: what is broken, since when, what it costs in orders and
money. Then: what can I do. Not a Grafana clone: no query builder, no metric explorer. The server computes every
status, threshold and check; the console only shows them (a `Measure` carries `value`, `unit`, `state`, `warn`,
`crit`, `direction`).

## Layout

Desktop (1440×900): header, verdict, KPI row, tabs. Problems first everywhere; healthy rows collapse into one quiet
line ("8 components operational · Show").

```
System health                                       [1h|6h|24h|7d] [↻ Refresh] [Maintenance]
Updated 8s ago · refreshes every 15s · v1.42.0 · a1b2c3d · production       Open in Grafana ↗
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ▲ Degraded · since 14:02 (38m)                                                [See alerts]│
│ Down: Dhru Prime (supplier). 1 critical alert firing · Incident: Supplier timeouts        │
│ Orders: 23 past SLA · $1,240.00 held · dispatch p95 4m 10s                                │
└──────────────────────────────────────────────────────────────────────────────────────────┘
┌Uptime 30 days─┬API p95───────┬5xx rate──────┬Oldest queued job┬Orders past SLA┬Open alerts─┐
│99.93 %  ✓ OK  │412 ms  ✓ OK  │0.42 %  ▲ Warn│3m 12s  ▲ Warn   │23  ✕ Critical │2 ✕ Critical│
│▁▂▂▃▂▁ 30 days │▁▂▅▃▂ 24h     │▁▁▃▅ 24h      │▁▂▃▅ 24h         │▁▃▅▇ 24h       │1 critical  │
│target 99.9 %  │warn 800 ms   │warn 0.5 %    │warn 2m          │warn 5         │            │
└───────────────┴──────────────┴──────────────┴─────────────────┴───────────────┴────────────┘
Overview · API · Orders & suppliers · Queues & jobs · Alerts & incidents · Data stores · Integrity
```

Mobile (390×844): one column, 16px gutters, nothing wider than the screen.

```
System health
Updated 8s ago            [↻] [Maintenance]
[1h|6h|24h|7d]
┌ ▲ Degraded · since 14:02 ──────┐
│ Down: Dhru Prime (supplier)    │
│ 23 past SLA · $1,240.00 held   │
│ [See alerts]                   │
└────────────────────────────────┘
┌ Uptime 30d ──┬ API p95 ───────┐   KPI tiles: 2 columns × 3 rows
├ 5xx rate ────┼ Oldest job ────┤
├ Past SLA ────┼ Open alerts ───┤
└──────────────┴────────────────┘
‹ Overview  API  Orders & sup… ›    tabs scroll sideways
┌ ✕ Down · Dhru Prime ───────────┐  wide tables become cards (label: value rows),
│ Latency 6.2 s · Timeouts 23 %  │  actions stay at the card foot
│ [Pause supplier]               │
└────────────────────────────────┘
```

## KPI row (one panel, six cells; value = now, trend = fixed window, state = server)

| Tile | Source | Unit | Trend | Proposed server thresholds (mocks use these) |
|---|---|---|---|---|
| Uptime 30 days | `health.uptime.d30` | % | 30 daily points | warn < 99.9, crit < 99.5 |
| API p95 | `metrics(24h).total.p95` | ms | 24h | warn > 800, crit > 1500 |
| 5xx rate | `metrics(24h).total.rate5xx` | % | 24h | warn > 0.5, crit > 2 |
| Oldest queued job | `queues.oldestAge` | duration | 24h | warn > 2m, crit > 10m |
| Orders past SLA | `orders-health.stuck.total` | count | 24h | warn > 5, crit > 20 |
| Open alerts | `health.alerts.open` | count | 24h | warn ≥ 1 open, crit ≥ 1 critical firing |

Each cell: label, value with unit, state badge (icon + word), sparkline in the de-emphasis ink, threshold text. Each
cell owns its query: one failing source shows that cell's error, the others stay.

## Tabs (URL `?tab=`, sub-views `?view=`, selections `?queue=` `?job=` `?incident=`; range `?range=`, default 24h)

| Tab | Reads | Actions | Notes |
|---|---|---|---|
| Header + verdict | `GET /admin/system/health`, `GET /admin/system/orders-health` (impact line) | `PUT /admin/system/maintenance` | Banner in the app shell on every page while maintenance is on |
| Overview | health, `GET /admin/system/checks` | links only | Components (problems first), uptime bars, response time of the picked component, open alerts, ongoing incidents, build |
| API | `GET /admin/system/metrics`, `GET /admin/system/errors` | none | Surfaces table, latency (p50/p95/p99 switch) and 5xx charts, slowest 10, top errors (mono code, request ID, Sentry link) |
| Orders & suppliers | `GET /admin/system/orders-health`, `GET /admin/system/suppliers` | `PATCH /admin/suppliers/:id` (`paused`/`active`, existing `updateSupplier`) | Stuck by status links to `/orders?pastSla=true…`; held by risk links to `/risk?tab=queue` |
| Queues & jobs | `GET …/queues`, `GET …/queues/:name/failed`, `GET …/jobs` (`?job=` history), `GET …/webhooks` | `POST …/queues/:name/retry`, `POST …/queues/:name/pause`, `POST …/jobs/:name/run` | Bull Board link per queue when configured |
| Alerts & incidents | `/admin/alerts` (L,S), `/admin/alert-rules` (L,S), `/admin/incidents` (L,S) | `POST /admin/alerts/:id/ack`, alert-rules C/U/D (mute = `mutedUntil`, enable = `isActive`), incidents C/U | Sub-views Alerts · Rules · Incidents; incident drawer with timeline |
| Data stores | `GET …/database`, `GET …/cache` | none | Meters for connections and memory, slow queries, long transactions, migrations |
| Integrity | `GET …/integrity` | `POST …/integrity/run` | Four ledger checks, findings, last result; read-only, it never fixes anything |

The range scopes time-based content inside tabs (charts, uptime bars, top errors, slowest endpoints), never the KPI
row or "now" values.

## States (every card: `HealthCard` around its own query)

| State | When | Shows |
|---|---|---|
| Loading | first load | skeleton in the card's shape |
| Refetching | poll or manual refresh | previous render kept (no skeleton flash) |
| Empty | 200 with nothing in it | "No data" in neutral, what it would show |
| Unavailable | 503 `MONITORING_UNAVAILABLE` | "Monitoring unavailable" in neutral with the server's detail; never green |
| Error | any other failure | what failed, request ID, Retry (`ErrorState`) |
| Stale | data older than 2 intervals, or the last refetch failed | last good data + "Stale · updated 2m ago" badge + Retry |
| Forbidden | 403 or missing read permission | "You need the alerts:read permission" |

Verdict tones: Operational (good, check) · Degraded (warn, alert) · Outage (crit, x) · Monitoring unavailable or
status unknown (neutral, info) · health call failed: "Status unavailable" (neutral, Retry). No data is never green.
Status changes are announced in an `aria-live="polite"` region (verdict and KPI state words).

## Charts (decision 010: own SVG, no library)

- Reuse `LineChart` (one series in `s1`, 2px line, 10% area, solid hairline grid) and `Sparkline` (KPI cells). Two
  extensions in the shared kit: `reference.bad: 'above' | 'below'` (latency and error rates are bad above) and null
  points drawn as gaps ("No data" in the tooltip).
- New, feature-local: `UptimeBars` (one cell per bucket; ok/degraded/down in the status dots, no-data as a hairline
  outline; tooltip and arrow keys per cell).
- One axis, never dual. Threshold = the server's `crit` (or `warn`) as a dashed line with its label; the stretch past it
  turns critical. Status hues only mean status (thresholds, bars of uptime), series hues never mean status.
- Hover tooltip and keyboard (arrow keys, live readout) on every chart; a "Table view" toggle under each chart; a
  skeleton only on the first load.

## Controls and confirmation

Every risky control opens a dialog that states the effect before the confirm button, asks for a reason where the
body takes one, reports the result by toast and shows the server's problem+json on failure. The server writes the
audit log.

| Control | Permission | Dialog says | Body |
|---|---|---|---|
| Maintenance on / change / off | `system:manage` | "Customers using <scope> get 503 MAINTENANCE with your message until you turn it off. This console is not affected." | scope (store, checkout, API orders, all), message, expected end |
| Pause / resume queue | `system:manage` | "Workers stop taking jobs from <queue>; waiting jobs stay queued." | `paused`, reason (required to pause) |
| Retry failed job / all failed | `system:manage` | "Retries <n> failed jobs of <queue> now." | `jobId` or `all: true` |
| Run job now | `system:manage` | "<job> runs now, outside its schedule (recorded as manual)." | none |
| Run integrity check | `system:manage` | "Runs the read-only ledger checks in the background; nothing is corrected." | none |
| Pause / resume supplier | `suppliers:update` | "New orders go to the next supplier by priority; orders already sent stay as they are." | `status` |
| Acknowledge alert | `alerts:update` | "Stops the reminders; your name and the time are recorded." | optional note |
| Alert rules: create, edit, delete, mute, enable | `alerts:create` / `alerts:update` / `alerts:delete` | delete and mute state the effect | rule fields, `mutedUntil`, `isActive` |
| Declare, update, close incident | `incidents:create` / `incidents:update` | closing asks for the root cause | title, severity, components, summary; status + update text; root cause |

Permission rules (hints only; the server decides): no write permission in the area at all → read-only: no action
buttons, one quiet note under the header. Some permissions → a missing one leaves its button disabled with the reason
as its visible title ("You need the system:manage permission").

## Permission map

- Page: any of `system:read`, `alerts:read`, `incidents:read`. Tabs Overview, API, Orders & suppliers, Queues & jobs,
  Data stores, Integrity and the KPI row: `system:read`. Alerts & incidents: `alerts:read` (alerts, rules) and
  `incidents:read` (incidents). Shell maintenance banner: `system:read`.
- Access page role matrix: new area "System" (`system`, `alerts`, `incidents`). Defaults: Owner and Admin manage;
  Finance, Support, Risk reviewer and Read only view.

## Refresh and freshness

Health and alerts poll every 15s, other cards every 30s, integrity every 5s while a run is in progress. React Query
stops polling while the browser tab is hidden. "Updated Ns ago" ticks every second; "Stale" after two intervals.
Refresh refetches every health query at once.

## Deep links (only when configured)

`VITE_GRAFANA_URL` (header, API tab), `VITE_SENTRY_URL` (top errors: the server's per-error `sentryUrl` shows only
when set), `VITE_BULL_BOARD_URL` (queues tab, per queue `<url>/queue/<name>`). Unset means no link, never a dead one.

## Mock scenarios (dev only, `?mock=<name>`, remembered for the tab; switcher in the mock layer only)

`healthy` · `degraded` (slow supplier, critical alert firing, open incident, 23 orders past SLA) · `outage` (database
down, 5xx spike, order and integrity reads failing) · `monitoring-down` (metrics and errors 503, verdict neutral) ·
`partial-failure` (only `GET /admin/system/queues` fails) · `maintenance` (checkout maintenance on, ledger mismatch
alert, failed integrity check) · `readonly` (degraded data, read-only staff member).
