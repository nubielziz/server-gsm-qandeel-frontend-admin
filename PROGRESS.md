# Progress

Single source of truth for status. The lead updates it after every step. Read it first.

## Status (2026-10-31)

**In progress: `system-health`** (new map route group `health`, designed from scratch: `docs/system-health-design.md`,
brief `docs/briefs/system-health.md`). Inputs refreshed on 2026-10-31 from the replaced `reference/`:
`docs/route-manifest.json` has **160 admin route rows, 268 admin endpoints** (+ `GET /health` = 269; `GET /metrics`
excluded: Prometheus target, the console never calls it), the map has **66 tables** (5 new: `service_checks`,
`alert_rules`, `alert_events`, `incidents`, `job_runs`; row types regenerated), `docs/slices/` has 18 slices.
Slices of the feature, one commit each: foundation, then the tabs Overview, API, Orders & suppliers, Queues & jobs,
Alerts & incidents, Data stores, Integrity.

- **Foundation: done** (`0a43792`). Types, 30 API functions (route coverage 30/30), hooks
  with polling, mock scenarios for all 30 endpoints, page shell, header, verdict, KPI row, maintenance dialogs, shell
  banner, shared status pieces; 58 test files. One Opus review; its 2 blocking and 6 visual findings fixed by the lead
  (`*/health` mock anchored to the root route and following the scenario; mutations take `{ toastErrors }` so a
  dialog's refusal is not shown twice; verdict names the open alerts; KPI trends one point per hour from zero; ms
  thresholds in the value's scale; phone layout of tiles, meta line and impact line). Mismatches M203–M217.
  Test infra: RTL waits up to 3 s (`src/test/setup.ts`) and a test may take 15 s (`vite.config.ts`): the suite grew
  by more than 60 heavy files and app-level tests timed out under full parallel load.
- **Tabs: in progress.** Seven worktrees `../worktrees/system-health-<tab>` on `feat/system-health-<tab>`; one workflow
  runs per tab: Sonnet implements and takes round-1 screenshots, Opus reviews code and images, Sonnet fixes and takes
  round-2 screenshots; the lead looks at round 2 (third visual round), then squash-merges the tabs in order (Overview,
  API, Orders & suppliers, Queues & jobs, Alerts & incidents, Data stores, Integrity), one commit each. Pool: at most
  4 implementers and 2 reviewers at once; no new tab while 3 wait for review. Budget: up to 3 calls per tab (21).
  Merged so far: Overview, API, Orders & suppliers.

### Earlier status (2026-10-30)

**Done.** All 17 features are merged on `feat/refine-admin`, route coverage is 239/239 (`--strict` passes), and
`npm run typecheck && npm run lint && npm run build && npm test` are green (295 test files, 3,058 tests). The production
bundle contains no MSW or seed code. Every demo/map disagreement is in `docs/MISMATCHES.md` (M1–M195); every assumed
body and the backend questions are in `docs/ASSUMED_CONTRACTS.md`. No worktrees or feature branches remain.

Next steps belong to the backend team: confirm or correct `docs/ASSUMED_CONTRACTS.md`, then adjust `types/` and `api/`
of the affected features (the mocks follow the same shapes).

## Agent budget

Limits: 8 at once (≤ 5 implementers, ≤ 2 reviewers, ≤ 3 readers), 10 calls per feature, 120 for the whole job.

| Used | Calls |
|---|---|
| Before the parallel phase | 11 (setup 1, foundation 5, access 2, orders 2, dashboard 1 stopped before any change) |
| dashboard | 2 (implementer, reviewer) |
| customers | 3 (implementer, reviewer, fix round by the same implementer) |
| merchants | 2 (implementer, reviewer) |
| services | 3 (implementer, reviewer, fix round by the same implementer) |
| suppliers | 2 (implementer, reviewer) |
| finance | 1 (implementer) |
| refunds | 1 (implementer) |
| risk | 1 (implementer) |
| resumed after limits | 5 (customers fix, services fix, finance, refunds, risk) + services round-2 review, checkouts, support |
| later | finance, risk, refunds, checkouts reviews; storefront, commissions, settings, audit implementers |
| final reviews and merges | support, commissions (+1 fix round), storefront, settings, audit |
| **Total before system-health** | **57 / 120** |
| system-health | each slice counts as a feature (≤ 10 calls): foundation, then 7 tabs. |
| system-health foundation | 5 (4 implementers: F-data, F-mocks, F-kit, F-page; 1 reviewer). Fixes by the lead. |
| **Total** | **62 / 120** |

## Pool

Empty: every feature is merged.

## Phases

| Phase | Status | Commit | Agents used |
|---|---|---|---|
| 0 Recon and setup | done | `9c6d484` (baseline `479694f`) | 1 (implementer: route manifest script, + 1 follow-up message) |
| 1 Architecture | done | see git log | 0 (Opus lead only) |
| 2 Foundation | done | see git log | 5/6 (implementers: A data layer, B UI kit, C shell + sign-in; review round 1: 3 blocking fixed by lead; round 2: 1 blocking fixed by lead) |
| 3 Feature loop | done | one `feat(<name>)` commit per feature | per feature below |
| 4 Final verification | done | README, ROUTE_COVERAGE 239/239, all checks green | 0 |

## Feature plan (build order)

Ownership source: `docs/feature-plan.json` (every endpoint of `docs/route-manifest.json` belongs to exactly one feature: 238 admin + `GET /health` = 239, checked). Orders comes before dashboard, customers and merchants because their screens embed order lists and the order drawer.

| # | Feature | Page | Route groups | Rows | Endpoints | Status | Agents | Commit |
|---|---|---|---|---|---|---|---|---|
| 0 | foundation | shell | auth, system | 7 | 7 | done | 5/6 | Phase 2 commit |
| 1 | access | `/access` | auth | 13 | 23 | done | 2/6 | feat(access) |
| 2 | orders | `/orders` | orders, suppliers | 16 | 17 | done | 2/6 (implementer, reviewer; 2 blocking fixed by lead) | feat(orders) |
| 3 | dashboard | `/dashboard` | ops, growth | 3 | 3 | done | 3 (1 stopped launch, implementer, reviewer: 1 blocking fixed by lead) | feat(dashboard) |
| 4 | customers | `/customers` | customers | 10 | 15 | done | see pool history | `00d9c96` |
| 5 | merchants | `/merchants` | clients, catalog, billing, growth | 12 | 23 | done | see pool history | `da5b39a` |
| 6 | services | `/services` | catalog, orders | 12 | 24 | done | see pool history | `f793aaa` |
| 7 | suppliers | `/suppliers` | suppliers, growth | 9 | 14 | done | see pool history | `335e527` |
| 8 | finance | `/finance` | clients, billing, growth, refunds | 10 | 14 | done | see pool history | `0cd4793` |
| 9 | refunds | `/refunds` | refunds | 8 | 10 | done | see pool history | `24b4ff0` |
| 10 | risk | `/risk` | risk | 7 | 11 | done | see pool history | `242a708` |
| 11 | checkouts | `/checkouts` | promo | 3 | 3 | done | see pool history | `55f3e12` |
| 12 | support | `/support` | support | 4 | 10 | done | see pool history | `926a808` |
| 13 | storefront | `/storefront` | storefront | 8 | 22 | done | see pool history | `229651a` |
| 14 | commissions | `/commissions` | growth | 4 | 13 | done | see pool history | `b0b268a` |
| 15 | settings | `/settings` | auth, billing, refunds, clients, ops | 12 | 28 | done | see pool history | `bc4febf` |
| 16 | audit | `/audit` | auth | 1 | 2 | done | see pool history | `44e0a22` |
| 17 | system-health | `/system-health` | health | 22 | 30 | in progress | see Agent budget | one per slice |

### 0. foundation (Phase 2) — 7 endpoints

Demo: `00-util.js`, `13-b2c-ui.js`, `20-ui.js`, `30-charts.js`, `90-app.js`, `input.css`, `tailwind.config.cjs`. Shell, UI kit, fetch client, providers, sign-in screens (no demo screen: built in the demo's style), API health in the sidebar footer, mock layer.

`POST /admin/auth/login` · `POST /admin/auth/2fa` · `POST /admin/auth/2fa/setup` · `POST /admin/auth/logout` · `GET /admin/auth/me` · `POST /admin/auth/password/set` · `GET /health`

### 1. access (`/access`) — 23 endpoints

Demo: `56-p-access.js`, `14-state-access.js`. Admins, IP allow/block, roles (demo ROLE_MATRIX is a UI reference only), active sessions (new tab, no demo screen).

`CRUD[LSCU] /admin/staff` · `POST /admin/staff/:id/password` · `POST /admin/staff/:id/sessions/revoke` · `POST /admin/staff/:id/suspend` · `POST /admin/staff/:id/reactivate` · `POST /admin/staff/:id/reset-2fa` · `CRUD[LSCD] /admin/ip-rules` · `POST /admin/ip-rules/check` · `PUT /admin/access/restriction` · `CRUD[LSCUD] /admin/roles` · `GET /admin/permissions` · `GET /admin/sessions` · `DELETE /admin/sessions/:id`

### 2. orders (`/orders`) — 17 endpoints

Demo: `41-p-orders.js`, `11-state.js (order selectors/mutations)`. Queue, filters, bulk actions, order drawer. Dispatch/fetch/change-supplier come from the suppliers route group but are order-drawer actions.

`CRUD[LS] /admin/orders` · `GET /admin/orders/:id/events` · `POST /admin/orders/:id/accept` · `POST /admin/orders/:id/reply` · `POST /admin/orders/:id/reject` · `POST /admin/orders/:id/reopen` · `POST /admin/orders/:id/refund` · `POST /admin/orders/:id/verification` · `POST /admin/orders/:id/notes` · `POST /admin/orders/bulk-reply/preview` · `POST /admin/orders/bulk-reply/apply` · `GET /admin/orders/export` · `GET /admin/files/:id` · `POST /admin/orders/:id/dispatch` · `POST /admin/orders/:id/fetch` · `POST /admin/orders/:id/change-supplier`

### 3. dashboard (`/dashboard`) — 3 endpoints

Demo: `40-p-dashboard.js`. GET /admin/queues is the Bull Board UI: exposed as a link, not fetched.

`GET /admin/dashboard` · `GET /admin/queues` · `GET /admin/reports/top-clients`

### 4. customers (`/customers`) — 15 endpoints

Demo: `48-p-customers.js`, `12-state-b2c.js (customer mutations)`. Block IP from a customer reuses createIpRule from features/access. Data requests: new tab.

`CRUD[LSCU] /admin/customers` · `POST /admin/customers/:id/account` · `POST /admin/customers/:id/password` · `POST /admin/customers/:id/sessions/revoke` · `POST /admin/customers/:id/suspend` · `POST /admin/customers/:id/reactivate` · `POST /admin/customers/:id/block` · `GET /admin/customers/:id/export` · `POST /admin/customers/:id/anonymize` · `CRUD[LSU] /admin/data-requests`

### 5. merchants (`/merchants`) — 23 endpoints

Demo: `42-p-merchants.js`. Merchant list + detail tabs (orders, wallet, pricing, API). Groups and KYC live here.

`CRUD[LSCU] /admin/clients` · `GET /admin/clients/:id/wallet` · `GET /admin/clients/:id/statement` · `POST /admin/clients/:id/wallet/adjust` · `PATCH /admin/clients/:id/credit-limit` · `GET /admin/clients/:id/api-keys` · `DELETE /admin/api-keys/:id` · `CRUD[LSCUD] /admin/client-groups` · `CRUD[LCUD] /admin/client-prices` · `CRUD[LS] /admin/kyc-submissions` · `POST /admin/kyc-submissions/:id/decide` · `GET /admin/reports/client-statement/:clientId`

### 6. services (`/services`) — 24 endpoints

Demo: `43-p-services.js`. Services, categories, pricing rules, price resolver, inventory codes (from the orders route group; managed per service).

`CRUD[LSCUD] /admin/service-categories` · `CRUD[LSCUD] /admin/services` · `PUT /admin/services/:id/fields` · `PUT /admin/services/:id/options` · `PUT /admin/services/:id/group-prices` · `CRUD[LSCUD] /admin/pricing-rules` · `POST /admin/services/bulk-price/preview` · `POST /admin/services/bulk-price/apply` · `GET /admin/pricing/resolve` · `CRUD[L] /admin/inventory-codes` · `POST /admin/services/:id/inventory/import` · `POST /admin/inventory-codes/void`

### 7. suppliers (`/suppliers`) — 14 endpoints

Demo: `44-p-suppliers.js`. Master-detail page; reroute uses supplier-links; supplier report feeds the detail stats.

`CRUD[LSCUD] /admin/suppliers` · `POST /admin/suppliers/:id/test` · `POST /admin/suppliers/:id/sync` · `GET /admin/suppliers/:id/services` · `POST /admin/suppliers/:id/import/preview` · `POST /admin/suppliers/:id/import` · `PUT /admin/services/:id/supplier-links` · `CRUD[LS] /admin/supplier-api-logs` · `GET /admin/reports/suppliers`

### 8. finance (`/finance`) — 14 endpoints

Demo: `45-p-finance.js`. Ledger, accounts, payments review, invoices and reports. Demo withdrawals tab has no admin API (see MISMATCHES).

`CRUD[LS] /admin/ledger/transactions` · `GET /admin/ledger/accounts` · `POST /admin/ledger/reconcile` · `CRUD[LSC] /admin/invoices` · `CRUD[LS] /admin/payments` · `POST /admin/payments/:id/approve` · `POST /admin/payments/:id/reject` · `GET /admin/reports/profit` · `GET /admin/reports/wallet-exposure` · `GET /admin/reports/vat`

### 9. refunds (`/refunds`) — 10 endpoints

Demo: `53-p-refunds.js`, `12-state-b2c.js (refund/dispute mutations)`. Demo payments tab = storefront payments report.

`CRUD[LS] /admin/refunds` · `POST /admin/refunds/:id/approve` · `POST /admin/refunds/:id/decline` · `POST /admin/refunds/:id/retry` · `CRUD[LS] /admin/disputes` · `POST /admin/disputes/:id/evidence` · `POST /admin/disputes/:id/accept` · `GET /admin/reports/payments`

### 10. risk (`/risk`) — 11 endpoints

Demo: `54-p-risk.js`, `12-state-b2c.js (risk mutations)`. Held queue, IMEI checks, blocklist, rules.

`GET /admin/risk/queue` · `POST /admin/risk/orders/:id/approve` · `POST /admin/risk/orders/:id/refund` · `CRUD[LS] /admin/imei-checks` · `CRUD[LSCD] /admin/blocklist` · `GET /admin/risk/rules` · `PUT /admin/risk/rules`

### 11. checkouts (`/checkouts`) — 3 endpoints

Demo: `51-p-checkouts.js`. Recovery only for customers with marketing consent (map rule, MISMATCHES M1). Funnel: new panel.

`GET /admin/checkouts/abandoned` · `POST /admin/checkouts/recover` · `GET /admin/reports/funnel`

### 12. support (`/support`) — 10 endpoints

Demo: `49-p-support.js`, `12-state-b2c.js (ticket mutations)`. Inbox + thread; reply templates as macros and a manage view.

`CRUD[LSU] /admin/support-tickets` · `POST /admin/support-tickets/:id/reply` · `POST /admin/support-tickets/:id/note` · `CRUD[LSCUD] /admin/reply-templates`

### 13. storefront (`/storefront`) — 22 endpoints

Demo: `50-p-storefront.js`. Listings, landing pages, help, legal, TAC catalogue. The demo's checkout preview tab needs the store API (out of scope): see MISMATCHES.

`CRUD[LSCU] /admin/tac-catalog` · `CRUD[LSCU] /admin/service-listings` · `CRUD[LSCU] /admin/content-pages` · `POST /admin/content-pages/:id/publish` · `POST /admin/content-pages/generate` · `CRUD[LSCU] /admin/help-articles` · `CRUD[LSC] /admin/legal-documents` · `POST /admin/legal-documents/:id/publish`

### 14. commissions (`/commissions`) — 13 endpoints

Demo: `46-p-commissions.js`. Accruals, agents (assignments), plans.

`CRUD[LSCUD] /admin/commission-plans` · `CRUD[LSCUD] /admin/commission-assignments` · `CRUD[LS] /admin/commission-accruals` · `POST /admin/commission-accruals/approve`

### 15. settings (`/settings`) — 28 endpoints

Demo: `55-p-settings.js`, `12-state-b2c.js (fx/gateway/policy/notif mutations)`. Gateways, tax, FX, policies (storefront settings), notifications; webhook deliveries and notification log are new tabs.

`GET /admin/settings` · `PATCH /admin/settings` · `CRUD[LSCUD] /admin/payment-gateways` · `CRUD[LSCU] /admin/tax-rates` · `CRUD[LSCU] /admin/currencies` · `POST /admin/currencies/refresh-fx` · `PATCH /admin/storefront/settings` · `CRUD[LSCUD] /admin/notification-templates` · `POST /admin/notification-templates/:id/preview` · `CRUD[LS] /admin/notifications` · `CRUD[LS] /admin/webhook-deliveries` · `POST /admin/webhook-deliveries/:id/retry`

### 17. system-health (`/system-health`) — 30 endpoints

No demo page: design in `docs/system-health-design.md`, brief in `docs/briefs/system-health.md`. Slices: foundation
(types, 30 API functions, hooks, mock scenarios, page shell, header, KPI row, shared status pieces, shell maintenance
banner), then Overview, API, Orders & suppliers, Queues & jobs, Alerts & incidents, Data stores, Integrity. Pausing a
supplier reuses `updateSupplier` (suppliers). Shared changes by the lead: `system-health` page resource and `pulse`
icon, manifest `banner` slot, `LineChart` gaps and threshold side, `?mock=` scenarios with a dev-only switcher and a
read-only `me`, System area in the role matrix and mock roles, `paused` supplier status, monitoring deep-link env
variables.

`GET /admin/system/health` · `GET /admin/system/checks` · `GET /admin/system/metrics` · `GET /admin/system/errors` · `GET /admin/system/orders-health` · `GET /admin/system/suppliers` · `GET /admin/system/queues` · `GET /admin/system/queues/:name/failed` · `POST /admin/system/queues/:name/retry` · `POST /admin/system/queues/:name/pause` · `GET /admin/system/jobs` · `POST /admin/system/jobs/:name/run` · `GET /admin/system/database` · `GET /admin/system/cache` · `GET /admin/system/webhooks` · `GET /admin/system/integrity` · `POST /admin/system/integrity/run` · `PUT /admin/system/maintenance` · `CRUD[LSCUD] /admin/alert-rules` · `CRUD[LS] /admin/alerts` · `POST /admin/alerts/:id/ack` · `CRUD[LSCU] /admin/incidents`

### 16. audit (`/audit`) — 2 endpoints

Demo: `47-p-audit.js`. Audit log with filters and expandable before/after.

`CRUD[LS] /admin/audit-logs`

## Fixes outside the feature loop

- `d1a8826` fix(auth): sign-out answered the session check itself (flaky `/login?to=…` race seen under load).
- feat(auth): sign-in screens rebuilt as one card over a silk wave drawn on a canvas (`src/features/auth/wave`),
  light and dark; design, contrast figures and leftovers in `docs/login-design.md`. The set-password form moved into
  `SetPasswordForm`. Auth logic, the auth provider, API functions and routes are unchanged.
- feat(auth): the sign-in silk moves: the same model drawn with WebGL, folds flowing slowly, still with reduced motion
  or without a GPU (decision 017).
- refactor(app): features register through `manifest.ts` (pages, registry, palette, nav counts) and keep their mocks in `src/features/<name>/mocks`; route slices, read-only `--feature` coverage, worktree script; shared pre-work for the next features (`DASHBOARD_KEY`, `ordersListPath`, `useCanOpenPage`, `RevealPasswordDialog` export, `imeiRetentionDays` setting).

## Blockers

- none

## Tech debt

- foundation: a 401 in the middle of a session signs out to `/login` without `?to=` (the user lands on the start page after signing in again).
- foundation: a signed-in staff member who opens an invite/reset link (`/set-password?token=…`) is redirected into the console instead of being told to sign out first.
- foundation: registry `create`/`update`/`delete` take no `ApiInit` (no custom headers such as idempotency keys); admin routes do not need them today.
- orders: the filter and reroute menus read `GET /admin/suppliers` and `GET /admin/clients` through private lookups (`src/features/orders/api/lookups.ts`, no `@route` tag, first 200 rows). Replace them with the suppliers and merchants features' functions when those are built.
- finance: the shared ledger mock (`src/mocks/handlers/ledger.ts`) answers before the finance mocks, so the dev Ledger tab's account filter and merchant search find nothing in the mock.
- tests: a few page tests (supplier reroute, customer consents) can time out under a fully loaded machine; they pass on their own.
- orders: Reroute is two calls (change-supplier, then dispatch). When the second fails, the order has moved but was not sent; the summary says so, but the pair is not atomic.
- access: editing your own account or role does not refresh `me` at once (name and permission hints update within the 60 s `me` cache or at the next sign-in); clearing `meCache` from a feature needs a small auth API.

## Open questions for the backend (not blocking)

- Auth bodies and CSRF token source: assumptions in `docs/decisions/006-auth-and-access-control.md` (MISMATCHES M5–M7).
- Exact shape of problem+json `errors[]` items (parser is tolerant, decision 007).
- Per-feature assumed contracts and questions: `docs/ASSUMED_CONTRACTS.md` (filled at each merge).
- Orders: could `POST /admin/orders/:id/change-supplier` take `dispatch: true`, so a reroute is one atomic call? Could the list sort by SLA urgency (the demo's default order)? Order DTO, event and action bodies are assumed (MISMATCHES M20–M34).

## Notes

- Demo tokens: `input.css` only has a build placeholder for the colour tokens; the exact values were read from the built demo in headless Chromium (CSS custom properties only, the file text was not read) and copied into `src/styles/index.css`.

- Custom agents in `.claude/agents/` load only after a session restart. Until then the lead uses stand-ins with the same instructions pasted into each brief: implementer = `general-purpose` on Sonnet; reader = `Explore` on Haiku (no Agent/Edit/Write tools); reviewer = `Plan` on Opus (no Agent/Edit/Write tools). The `general-purpose` stand-in relies on its brief for "never spawn agents".
- Serena is exposed as one REPL tool (`mcp__serena__serena_repl`), not as separate `find_symbol`-style tools; the agent definitions list that tool instead.
- All development artifacts (code, comments, docs, commits) are in English (user rule); map descriptions were translated in `scripts/route-descriptions.en.mjs`.
