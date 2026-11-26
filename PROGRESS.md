# Progress

Single source of truth for status. The lead updates it after every step. Read it first.

## Next (planned 2026-11-09, not built): `../backend/docs/ROADMAP.md`

The console's own next work is phase 0 of that plan: merchant actions it cannot do yet (send a password reset link, resend an
invitation, edit a merchant's details, reset 2FA and end sessions; optionally create an API key for a merchant), plus the
webhook-secret field of the payment gateway form. The owner deferred phase 0 ("later", 2026-11-09): the public site for
merchants and customers (Arabic and English; phases 1 to 3) comes first, as a separate app in `../storefront`, built in a new
session from `../STOREFRONT-HANDOFF.md` (2026-11-16: the owner removed Arabic, so the site and the console are English only, decision 039). To run the console against the real backend, start it with `VITE_API_MOCKS=false
VITE_DEV_PROXY_TARGET=http://localhost:3000 VITE_API_BASE_URL= npm run dev` (the local env files say `VITE_API_MOCKS=true`).

## Status (2026-11-26): the quantity sits inside Custom Fields; the main input is a tick box (decision 032)

On the owner's order the Field part of a service is one section. The "Quantity Field" section is gone: its menu and boxes sit under the fields table
of Custom Fields, and one Save sends only what changed (`PUT .../fields`, `PATCH /admin/services/:id`, fields first; a failed part stays dirty with its
message and the other stays saved). The main input is a tick-box column "Main input" beside "Required" (one row at most), in place of the icon button
and the badge; a server message about it shows on the tick box. No API change. Built by a Sonnet implementer, reviewed by an Opus reviewer (code ok,
small items fixed), looked at in a browser on mock data by the lead. Checks: typecheck, lint, route coverage, live routes, the services and kit tests
(1,253 pass), the build. Merged and pushed on the owner's word.

## Status (2026-11-26): IMEI is a field type (decision 031)

On the owner's order an IMEI service no longer forces an IMEI (backend decision 073): the field type list gains "IMEI (15 digits)" for every service
type, the warning of an IMEI service without a main input is advice ("Mark the field the order is about ... so the supplier receives it"), and the mock
gives an IMEI service created by hand its default field (Name and label IMEI, type imei, required, main input), as the server does. Built by a Sonnet
implementer, reviewed by an Opus reviewer (ok). Checks: typecheck, lint, route coverage, live routes, the services tests (956 pass), the build.
Merged, not pushed (waiting for the owner's word).

## Status (2026-11-26): the Options section and the Pattern column are removed (decision 030)

On the owner's order the Field part of a service lost its Options section (Models, Networks, MEP) with its call of `PUT /admin/services/:id/options`
(retired by the backend, its decision 072; production held no option rows) and the Pattern column of the Custom Fields table. A saved field's
pattern is a hidden value of the form, sent back untouched on save (`''` for a new field): production's 354 patterns come from the supplier import
and keep judging orders. The mock still answers `options: []` on the service read, as the server does. Built by a Sonnet implementer, reviewed by
an Opus reviewer (ok), finished by the lead. Checks: typecheck, lint, route coverage, live routes, the services tests (948 pass), the build.
Merged and pushed on the owner's word.

## Status (2026-11-26): custom fields are the whole order form (decision 029)

The shop's order forms draw only a service's custom fields (owner's ruling; shop decision 007, backend 070). The Custom Fields section says so:
new empty line, new intro and main-input tooltip, and `MainInputWarning`: an IMEI service whose draft has no main input shows "Buyers cannot
order it in the shop until one field is marked Main input" (advice only, Save is never blocked). No API change. Built by a Sonnet implementer,
reviewed by the lead. Checks: typecheck, lint, the touched unit tests (30 pass). Merged and pushed on the owner's word.

## Status (2026-11-26): motion in the whole console (decision 028)

The owner asked for animation when switching pages in the sidebar and when switching tabs. Built as decision 028: a new page fades in
and rises (200 ms), the sidebar's highlight, the tab line and the strip tabs' raised box slide to the new item (300 ms), and the content
under a tab comes in from the side of the tab (8 px, 200 ms). Enter only, nothing remounted, none of it with "reduce motion"; tables and
live numbers do not animate. The kit is `src/lib/motion` (no library). The sidebar's highlight uses `line` at 60 % so it can be seen in
the light theme. Agents: one Sonnet 5.5 implementer (two rounds), one Opus 5.5 review (six findings, all fixed: a scrollbar flash, the
enter on kept old rows, the highlight over the group headings, sub-pixel placement, a hidden focus ring, a comment); the lead (Fable 5.2)
planned it and checked every page in a browser on the mock data (the 14 sidebar pages, every tab strip, both themes, reduced motion).
Checks: typecheck, lint, the whole test suite and a production build.

## Status (2026-11-25): code-stock services and a service's own cost (decision 027)

The owner sells their own gift-card codes. A service now says whether it is **Delivered from code stock** (only then does it hold codes,
show Inventory, and take codes for its orders) and has **Your cost** (so shop rules and the floor can price an own service). Code-stock
services show "Codes: N in stock" instead of "No supplier"; the shop's new reason `out_of_stock` is worded. Backend: decision 069
(migration 0070). Built by a Sonnet agent (console) and an Opus agent (backend) in parallel on a contract the lead wrote, each reviewed by
an Opus reviewer, one fix round each. Release: console first, then backend.

## Status (2026-11-25): every group is listed, and the Group view has a search

Found by the owner on production: a new group never showed in Product / Services › Group, and adding it again said the name was taken.
Production has 265 groups; the console read only the first 200 of all kinds by position and a new group goes last, so every group past
200 was missing from the Group view and from every group picker (+Add Service, a service's Overview, the All filter, Pricing, bulk
prices, price rules, and Add from supplier's "Service Listed In Group"). The reads now take the server's largest page (1000; a warning
above the list says so if there are ever more). The Group view gained a Quick Search (`q`, by name within the kind; the order buttons
rest while it is on), opens on the page of a group just added and marks it, and says "A group with this name already exists in <kind>."
Built by a Sonnet agent, reviewed by an Opus reviewer (one more capped read found and fixed by the lead). Console only.

## Status (2026-11-25): one Money page (decision 026)

The owner asked to merge Finance and Refunds & disputes into one page, **Money** (`/money`), in the layout of the Accounts page, frontend only.
The page has a strip of Overview, Money in (Deposits, Shop payments), Money back (Refunds, Card disputes), Books (Ledger, Trial balance,
Store balances, Invoices, +Issue invoice) and Reports (Profit, Wallet exposure, VAT, Sales funnel), then the text links of the open tab; every
link is a full view (`?view=`). The Overview carries both pages' figures, "Run reconciliation" and a "Waiting for you" list; "+Issue invoice"
is a full view. The views stay in the finance and refunds features (`views.ts`, loaded on demand); the `money` feature holds the frame and
the one address builder (`src/features/money/lib/moneyViews.ts`). `/finance`, `/refunds`, `/commissions` and `/checkouts` redirect for
good with their keys. Links from the palette, the dashboard and the audit log, and the sidebar count, follow each view's own permissions.
No route, type or line of an API function moved, so the backend's contract of the console is unchanged.
Built by four Sonnet agents in parallel worktrees on a contract the lead wrote first, merged by the lead, reviewed by an Opus reviewer (four
findings, fixed by a Sonnet agent and checked by the lead); plan in `/home/saifi/gsm-project/.money-page/PLAN.md`.
**Checks:** typecheck, lint, build and the whole suite (see the merge commit).

## Status (2026-11-25): Shop content trimmed (decision 025)

The owner asked to remove the Landing pages tab and the TAC catalogue tab of Shop content and to keep only the index section of its
Search tab. The page now has three tabs: Content and legal (the default), Help centre and Search (the index status and "Rebuild index").
Gone with their API functions, hooks, mocks, seed rows and tests: landing pages and "Generate drafts", the TAC catalogue, synonyms,
pinned results, "Test a search", the search report and the hidden terms. Old addresses (`?tab=landing`, `?tab=tac`,
`?tab=search&section=pins`) still open Shop content. The page opens for `storefront:read` or `legal:read` (not `catalog:read`).
Built by two Sonnet agents in parallel worktrees, merged and reviewed by the lead and an Opus reviewer (plan:
`/home/saifi/gsm-project/.shop-content-trim/PLAN.md`). **Checks:** typecheck, lint, build and the whole suite (7,661 tests) pass.
**Release:** the console goes first, then the backend (its decision 068, migration 0069), then the shop's regenerated types.

## Status (2026-11-24): one Name per custom field (decision 024)

The backend's decision 065 gives every custom field of a service one Name (what a supplier receives), with a hidden key the server makes and a flag for the
main input. The console follows and shows the buyer's answers on the order.

- **The Custom Fields table** (Product / Services, Field part): the columns are No., Name, Label, Type, Required, Pattern and Actions; the Key and Supplier key
  columns are gone. A saved field's hidden key goes back unchanged, a new row sends none, and a repeated Name is refused in the browser and by the server. The
  flagged row shows a "Main input" badge and each row has a switch in its Actions (a service has at most one main input).
- **The order drawer** lists the buyer's answers to the service's custom fields (label, then value) from `GET /admin/orders/:id` (`answers`). The label and the
  value each read in their own direction, a multi-line answer keeps its line breaks, and an answer that is the order's input is not shown a second time.
- **The mock layer** plays the server's rules for the fields route (key from the Name within 60 characters, Name within 120, unknown key, repeated Name, one main
  input, an IMEI service's field named IMEI is the main input when none is flagged) and the order answers as text.
- **Backend needed** (its decision 065): the wire is in MISMATCHES M368 and M369. The console is released together with that change; an older console cannot save
  fields against it. The route files made from the backend's contract (`npm run mocks:live`) are made again once the backend carries it.

## Status (2026-11-24): one Accounts page (decision 023), merged

The backend's decision 064 makes merchants and customers one account type, told apart by a rank. The console follows: the Merchants and Customers
pages are gone and one page, Accounts, does what both did, in the layout of the Product / Services page (decision 022).

- **The page** `/accounts` ("Accounts", Operations group): a strip of **All accounts, Retail, Merchants, Guests** with counts and a row of views, **All,
  Add Account (+), Ranks, Add Rank (+)** and **Data requests (n)**. Every view is a full view with the footer pager and the pinned bar; the "With selected"
  strip suspends, reactivates and signs accounts out, and moves no money.
- **The record** `/accounts/:id`: a left menu of up to thirteen parts (Overview, Financial, Profile, Invoices, Payments, API, Security, Prices, Orders,
  Support, Statement, Privacy and risk, Activity Log) shown by what the role may read and what the account has (a merchant rank, a login, a guest).
  Actions sit in the part that owns them; there is no action header.
- **Ranks**: the groups became the Ranks view. **Change rank…** names the blockers and the amount that moves with the account; it is offered to the Owner only,
  as are a merchant rank in Add Account and a new API key. Every money write sends one `Idempotency-Key` per dialog opening.
- **Old addresses** of `/merchants` and `/customers` redirect for good. An old customer record carries `from=customer`, because a customer number is
  not an account number: the page asks the server which account it became. `g m` opens Accounts; `g k` is retired.
- **Other pages** name accounts, not merchants and customers: orders (the buyer and its rank), refunds, risk, finance (store balances, the ledger kind "Rank
  change transfer"), support, notifications (the people picker has the tabs Staff and Accounts), audit (one filter, "Account"), the dashboard (one Top
  accounts panel), system health (the check that wallets follow ranks), access (sessions of either kind) and Product / Services ("Rank").
- **Backend needed** (its decision 064): the account routes, the rank change and the 410 on `/admin/customers*`. The wire the console reads is in MISMATCHES
  M328 to M367. The two repositories and the shop are released together.
- **Checks**: typecheck, lint (eslint, prettier, the English check) and the production build pass. The Accounts and finance suites passed on their last full run
  (1,321 tests); the mock-layer tests, the live-route generator test and the people picker test pass. The whole suite passes (7,723 tests).
  `src/mocks/liveRoutes.gen.ts` and `docs/ROUTE_COVERAGE.md` are made again from the backend's contract and the `@route` tags.
- **Not in this version**: lifetime figures on Overview (the detail read carries only the 30-day figures), a bulk action that moves money, and the retired
  Flagged tab and risk level.

## Status (2026-11-24): the Product / Services page (decision 022), built on `feat/products-services`, merged

The owner found the one-page Catalog too complex and asked for a page in the layout their staff already know. The Catalog page of
2026-11-23 is removed completely (its table, side panel, settings and publish views, the three-step add dialogs and the kit pieces only
they used); `/catalog`, `/services` and the older Storefront tabs redirect to the new addresses with their parameters.

- **The page** `/products` ("Product / Services"): a strip of service kinds (IMEI, Server, Remote, File) and a row of views:
  All, Pricing, +Add Service, Group, +Add Group, and Price Rules, Shop Publish, Inventory. Every view is a full view; lists end in a
  footer bar (results, go to, pager, page size), forms are label-left and end in a pinned action bar.
- **All**: a Quick Search box (group, search, supplier, show), the list (name with number and code, supplier connection with its
  fallback, group, a status square, a shop square, the edit link) and the "With selected" strip (enable, disable, put on the shop, take
  off, move to a group, delete).
- **Pricing**: a grid with the purchase cost, the supplier's price, the base price, the shop price and one column per merchant rank,
  edited in place and saved row by row; every figure and margin is the server's. "Display Enable/Disable Service" and "Set Order".
- **+Add Service**: one form for a service made by hand, and, with the box ticked, for services of a supplier (whole groups or single
  services, the group, the status, on the shop or not). A new service is completed in its editor.
- **The editor** of one service: a left menu of parts, each saved on its own: Overview, Set Pricing, Field, API Connection (the primary
  connection and the secondary ones in order), Retail Purchase, Inventory, Activity. A part with unsaved edits asks before it is left.
- **Group / +Add Group**: the groups of a kind with their order, status and visibility.
- **Backend needed** (its decision 063): `GET /admin/services/price-grid`, `POST /admin/services/order` with the stored order of
  services, and the optional `status` and `categoryId` of the supplier import. The two repositories are released together.
- **Checks**: typecheck, lint, the production build and the whole test suite (6,896 tests) pass. The first run on GitHub (2026-11-23)
  failed 30 tests. Most were expectations left behind by the last fix round (the footer pager's words, the place of a tooltip, a query
  that now finds two elements); five were defects of the screens and were fixed: a part of the editor was started again after its own
  save and lost its "Saved" note; the list never settled when the address named a page past the end; the Inventory part drew before
  the permissions were known; the supplier form said "not among your connected suppliers" for a moment before the list was read; and
  an address wrote the sub-view of a view (`tab`) after the list's keys.
  Three reviews (the layout against the reference, behaviour, tests and contract), a fix round, and a look at every view in a browser.
- **Not in this version**: the purchase cost cannot be typed (it comes from the supplier connection); the bulk price change and the
  editors of the price rules, publish runs and code imports are still dialogs.

## Status (2026-11-23, replaced on 2026-11-24 by the Product / Services page): one Catalog page (decision 019), built on `feat/catalog`, merged

Owner request: adding and pricing a service took three pages (Services and pricing, Suppliers, Storefront). Now one page does it.

- **The page** `/catalog`: a table of services (type, supplier and cost, merchant price, shop price, one "On the shop" switch, enabled),
  the chips All, Needs attention, Not on the shop and Switched off, category and supplier filters, bulk actions; a settings view
  (categories, merchant price rules, shop price rules, price resolver, code inventory) and a publish view. The old addresses of
  `/services` and `/storefront` redirect with their parameters; what is left of the Storefront page is "Shop content" under System.
- **The service panel** (`?open=<id>&section=<id>`): Details, Order form, Suppliers, Prices, Shop page, Activity, each saved on its own,
  beside the table from the 2xl width and in its place below. It asks before unsaved typing is lost.
- **Add services** (`?add=<supplier id>|new&from=groups|services`): where from, prices and category, finish; whole groups or single
  services of a supplier, or a service of one's own. The console computes no price: it shows the server's figures.
- **The shop switch** puts a service on the shop through a publish run of that one service, applied only when the server says its row is
  ready; otherwise the run is discarded and the server's reason is shown with the next step.
- **Backend needed**: the catalog reads of the backend's decision 060 (new optional fields on the service row, five list filters, the
  sort by shop price, `GET /admin/services/:id/supplier-links`, `createdServiceIds` on the import answer). Release order: that backend
  step first, then this console, then the backend step that makes the new fields required.
- **Checks**: typecheck, lint and the production build pass. The first stages ran the whole test suite (6,049 tests); the tests of the
  last stage (the panel, the Add services flow and the review fixes) were written and are run by the checks on GitHub, not locally. A
  review by area with a second check of every finding, then a fix round; a click-through in a browser on the demo data.
- **Not in this change**: choosing a category or changing a price inside step 2 of Add services (the server has no input for it); bulk
  routes (bulk actions are single calls in turn); the older Quick add and Import dialogs stay on the Suppliers page.

## Status (2026-11-18): bulk publish and retail pricing (feature 31), built on `feat/console-31`, not merged

The console half of backend feature 31 (plan `../backend/docs/briefs/31-bulk-publish.md`, decision 040, rulings B228 to B231;
the backend is on `feat/backend-31`). Built in four Sonnet slices after `main` (features 32 and 33, the brand) was merged in,
each with its own checks; the lead reviews the branch before it is merged. M265 and M10c.

- **Retail pricing tab** (C1): the rules (global, a service type, a category) with a server preview before every save, turn off
  and delete, the price changes the follow pass made and the proposals that wait (apply or keep), the Rule / Typed / Waiting
  tags in "Services on sale", and "follow the rule" in the price dialog. A rule for IMEI covers services that take a real IMEI;
  services that ask for an ECID or a serial number count as Server (the hint in the rule dialog, plan correction 11).
- **Publish tab** (C2, C3): start (everything, a category or a supplier; ticked services and a Quick add run start from their
  own screens), the preview of up to
  every service (the server's titles, slugs, prices, margins and flags; search, chips, edit one row with **Save and next**, bulk
  actions by ticked rows or "all that match", **Check again**), the confirm dialog (a tick box above 500), progress, result,
  **Review the rest**, **Continue**, **Prepare again** (a preview that never finished, or a Check again run discarded while it was prepared), the run switch (take a run off the shop and put it back) and the history. Entry points:
  Services (ticked rows), Suppliers (a supplier's services), Services on sale and Quick add.
- **Quick add** (C4): the tick box **Also put them on the shop** (locked while "Switched off" is chosen and without
  `storefront:publish`), the review bullets, the server's "set a retail pricing rule first" refusal with a link to Retail pricing,
  and a "Publishing to the shop" line in step 3 (read every 5 s while the publish run is live; "The shop preview was not
  prepared." with **Prepare the shop preview** when no run exists 2 minutes after the end). The dialog opens on step 3 again
  when the newest run ended after asking to publish, so the line and the button are not lost (the review of C4 fixed this).
- **The console computes no price, title or slug** (M92 stands): every figure and every proposal is the server's.
- **Checks on the branch (2026-11-19, after the review fixes of C4 and the approval of price changes):** `npm run typecheck`,
  `npm run lint` (eslint, prettier, english-only) and `VITE_API_MOCKS=false npm run build` are green. The whole suite through the
  slot (`with-slot.sh npm test`: 521 files, 5805 tests, 382 s) ran 5804 passed, 1 failed: `system-health/header/VerdictPanel.test.tsx`
  "is warn when degraded" (not touched; it expects a time of day without a date for an incident that began 38 minutes ago, so it
  fails in the first 38 minutes after local midnight, here at 00:19, alone and in the full run). `npm run routes:coverage`
  (2026-11-18): 269 of 269 map endpoints covered; the 16 routes of this feature are beyond the map ("unknown tag" in
  `docs/ROUTE_COVERAGE.md`, as the Quick add and search routes are).
- **Not done on purpose:** `src/mocks/liveRoutes.gen.ts` is not regenerated (the new routes stay mocked in `unbuilt` mode until
  the backend branch is merged); `storefront:create` is not in the Storefront page's permissions (a role that can create but
  not read the storefront cannot open the page); feature 30's note is already in the 2026-11-17 status below.

## Status (2026-11-17): English only, the Add listing search, ready-made payment methods, the IMEI-HUB brand, the sync toast

The merges of 2026-11-17, each with its backend commit (the backend's `PROGRESS.md` has the whole story of each):

- **English only (feature 30, backend decision 039), `b24098b`.** Language existed in the console only as fields of the content
  it manages; all of it is gone with the backend's wire: no Language select, column or `locale` in the storefront, notification,
  customer, merchant, settings and support screens; a legal document keeps a read-only `locale` (a retired non-English version
  is listed under "Earlier versions kept for the record"); no right-to-left code; a ticket message renders with `dir="auto"`, so
  Arabic text people type still reads correctly. The guard `scripts/check-english-only.mjs` is part of `npm run lint`. M264.
- **The Service field of Add listing searches on the server, `b9d8ded`.** A combobox over `GET /admin/services` instead of a
  select of the first 200 services (most were missing after a supplier's Quick add).
- **Ready-made payment methods with logos (feature 32, backend decision 041, B232), `d3d7f59`.** Settings, Payment methods: a
  gallery of ready-made methods (bank transfer, crypto transfer, Vodafone Cash, Fawry, InstaPay, Binance Pay; NOWPayments and
  Binance Pay (automatic) as "Coming soon"), **Add** opens the dialog filled from the entry (for merchants and customers alike,
  switched off until staff complete the transfer details), each method shows its logo (uploaded, else bundled, else an icon),
  the edit dialog has a Logo field (at least 64 pixels on each side), and a method made from an entry keeps its driver and its
  kind (fixed in the dialog; the server refuses a change). Bundled logos and their sources: `docs/LOGOS.md`. M266. Built by
  Sonnet, reviewed by Opus (one fix round). The real backend has no payment method until the owner adds them.
- **The brand is IMEI-HUB, `8231e58`.** The owner's mark (`BrandMark`, both themes) in the sidebar and on the sign-in screens,
  the tab icon, and "IMEI-HUB" instead of "GSM Supply" in every title, mock and test. Never write the old name again; the demo
  sign-in addresses (`@gsm-supply.example`) stay. The kit is outside the repository: `/home/saifi/gsm-project/.brand/`.

- **The sync says what it changed (feature 33, backend decision 042, B233), `5ed70c8` and `46b2bde`.** A real Dhru Fusion
  supplier names the main box of an IMEI service (an ECID, a serial number instead of an IMEI) and marks its required fields
  with `required: "on"`; the backend's sync brings the services imported before in line (a server service that asks for the
  box; required fields made required) and answers how many in `adopted`. The toast after "Sync now" adds "N services now ask
  for what the supplier requires (its own input instead of an IMEI, or its required fields)." (`features/suppliers/lib/sync.ts`).
  M267. The first commit ran the four commands (5342 tests); the second changed one sentence and ran the supplier tests
  (212), typecheck and lint only, at the owner's request to finish quickly.

Checks after the merges are at the end of the backend's feature 32 paragraph. Feature 31 (bulk publish) was parked on
2026-11-17 and resumed on 2026-11-18: see the next status.

## Status (2026-11-08, evening): the console runs on the real backend with no mocks

The backend builds every route the console calls (269 of 269; it has all 382 entries of the map). `src/mocks/liveRoutes.gen.ts`
lists 268 routes (the 269th, `GET /admin/queues`, is the Bull Board page the dashboard only links to). **Walk with
`VITE_API_MOCKS=false`** (Playwright, real sign-in with password and TOTP, Prometheus and Mailpit running, the backend's dev
database migrated and seeded): every page and every tab of its first tab list, plus a merchant's and a customer's detail
(76 steps): **289 real API calls, none mocked, no failed call, no page or console error** (`../backend/.lead/walk/walk-final.cjs`,
screenshots in `../backend/.lead/walk/out-final2`). The walks asked for two console changes: the Customers header counted
storefront customers as buyers (a guest exists from the first checkout): M259, `28a4d97`; and an idle supplier on the dashboard
is a neutral "No recent calls" badge, never healthy and never a fault (the backend sends `unknown`, its B180): M260, `df99600`.
After the backend's last merge (P4a, `6afa404`) the walk ran again: 76 steps, 290 real calls, none mocked, no failure, no page or
console error (`../backend/.lead/walk/out-final3`). Checks on `main`: typecheck, lint, build and 405 test files / 4,261 tests
green. README and `docs/ASSUMED_CONTRACTS.md` say to run with mocks off (`211ff14`). **The port is complete.**

## Status (2026-11-07): integration with the real backend started

The backend (`../backend`, its own `PROGRESS.md`) finished its wave 1: staff sign-in, access (all 23 routes), merchants and
their wallets, the ledger and reconciliation, currencies, audit log and settings. The console gained a third dev mode,
`VITE_API_MOCKS=unbuilt` (decision 018, README "Against the real backend"): every route the backend has built goes to the
real API through the dev proxy, the rest stays mocked. `src/mocks/liveRoutes.gen.ts` lists the built routes the console
calls (`npm run mocks:live`, generated from the backend's OpenAPI contract), after the backend's catalog
features 4a (services, categories, client groups, code inventory) and 4b (price resolver, pricing rules, group and client
prices, bulk price), its tax rates (Settings > Tax and currency is now all real) and its feature 7b (a merchant's API keys
and the webhook delivery log), its orders engine (feature 5), its suppliers (feature 6), Dhru and REST v1 (feature 7a: no console screen), its
billing (feature 8) and its dashboard and System health (feature 9): **154 routes**. `docs/ASSUMED_CONTRACTS.md` has
a table of what the backend now confirms. The backend's feature 14a (storefront catalog, IMEI check,
guest checkout, tracking; merged 2026-11-07 night) adds no console route, so the list stays at 154. Next backend merges
(running on 2026-11-07 night, resumed the next day): 12a notifications, 14b customers, 15 storefront content, 11
commissions and reports, 12b alerts and integrity, 16 B2C payments, refunds and disputes; after each, `npm run mocks:live`
and a walk of the pages it feeds.

**2026-11-08:** the backend merged 12a (notifications), 15 (storefront content), 14b (customer accounts) and 11 (commissions
and reports): `src/mocks/liveRoutes.gen.ts` lists **211** live routes. Walk against the real API (Playwright, real sign-in):
Settings (notification templates and log, tax and currencies), Storefront (all five tabs), Customers (list, suspended, a
customer), Commissions (accruals, agents, plans) and Finance reports made 133 real calls with no failure and no page or
console error; only `GET /admin/data-requests` (backend feature 18) stayed mocked. No console change was needed. Backend still
to merge: 12b (alerts), 16 (B2C payments and refunds), 17 (support), 18 (risk and privacy), 19 (growth).

Runtime walk (Playwright against the real API, real sign-in with password and TOTP, 2026-11-07): 15 pages (Admins and
access: all five tabs; Merchants: list, pending, groups, detail, wallet; Finance: ledger, trial balance; Settings: tax and
currency, system; Audit log) made 112 calls the real API answered and 54 the mocks answered, with no error. Real writes
through the UI: run reconciliation, approve a pending merchant, post a wallet adjustment; the audit log shows them. The
walk found one backend issue (audit action phrases of the money module, fixed in the backend) and no console change was
needed. Checks after the change: typecheck, lint, build, 404 test files / 4,254 tests (the mock tests again after the
route list grew).

Note: a production build reads `.env` too, and a local `.env` with `VITE_API_MOCKS=true` makes `npm run build` refuse
(by design, decision 014); run the build with `VITE_API_MOCKS=false npm run build` or keep the flag in
`.env.development.local` only.

Second walk after 4a (Services & pricing: services, categories, inventory, rules; merchant groups; a merchant page): 42
real answers, no error, and a real service disable and enable from the Services list. No console change was needed.
With no mocks at all (`VITE_API_MOCKS=false`), the pages of unbuilt routes (dashboard, orders, customers, deposits, system
health) show their error state with the server's `404` detail and request id and a Retry button; nothing crashed (83 real
calls, no page error). The sign-in origin must be one of the backend's `CORS_ORIGINS` (`http://localhost:5173` in dev): a
dev server on another port gets `403 CSRF_FAILED` at sign-in, by design.

Third walk after 4b (price resolver, rules and groups, services list, a merchant's pricing tab): 30 real answers, no error;
the resolver trace and the client override with its floor come from the real API.

Fourth walk after 7b (2026-11-07): a merchant's API access tab lists the real keys and revokes one (`204`, the toast and
the Revoked badge follow); Settings > Webhook deliveries lists the real log, opens a failed delivery in the drawer and
retries it (`200`, Waiting); a second retry within the minute gets the server's `429 RATE_LIMITED`, shown under the
buttons. No console change was needed (the backend's seeded payloads were fixed: each event now carries its own data).

Fifth walk after the backend's orders engine (2026-11-07): the seven Orders tabs with their counts (70 real answers),
then on one order Complete (with a reply), Reopen and Reject through the drawer, and Accept on a manual order: all `204`
from the real API, with the toasts, the drawer's timeline and money, and the Finance ledger's settle, reversal and release
journals. A second walk covered the rest of the page: the verification decision (`204`), a staff note (`204`), a bulk reply
matched by IMEI (preview `200` with both lines matched, apply `200` with 2 applied) and the CSV export (`200`). No console
change was needed.

Stock delivery (backend, 2026-11-07): a merchant order of a service with codes in stock comes back completed; the console's
drawer shows the code under "Result sent to merchant" and the timeline line "Delivered from stock: 1 code" with the
settlement. No console change was needed.

Sixth walk after the backend's suppliers (feature 6, 2026-11-07): the Suppliers page lists the six seeded suppliers with
their health, success rate, latency, open orders, balance, services and masked key from the real API; a merchant order
placed through the portal was sent by the real dispatch job, the placeholder supplier refused the connection and the order
went to Needs review with the supplier's reason; Retry from the drawer (`POST /admin/orders/:id/dispatch`, `204`) sent it
again. No console change was needed.

Seventh walk after the backend's billing (feature 8, 2026-11-07): Finance > Deposits from the real API, a pending bank
deposit approved and credited from its dialog (`200`, the toast names the new wallet balance), Finance > Invoices and one
invoice, Settings > Payment methods (four gateways, masked secrets, limits, groups, 30-day volume), and Merchants >
Verification with a KYC request approved (`200`). 82 real answers, no failure, no console change.

Eighth walk after the backend's dashboard and System health (feature 9, 2026-11-07): the Dashboard (KPIs, attention items,
open queue by type, supplier health) and the System health tabs Overview, API, Orders & suppliers, Queues & jobs and Data
stores, 52 real answers and no page error. Prometheus was not running, so `/admin/system/metrics` and `/errors` answered
`503 MONITORING_UNAVAILABLE` and the page said so in its banner ("Prometheus is not configured") with the affected tiles
marked "Monitoring unavailable": the outage state the design asks for. No console change was needed.

Next: after each backend merge run `npm run mocks:live`, commit the list, and walk the pages the new routes feed (still
being built: commissions and reports, notifications, storefront checkout, customers, storefront content, alerts and
incidents, then refunds and disputes, support, risk, growth).

## Status (2026-10-31)

**Done: `system-health`** (new map route group `health`, designed from scratch: `docs/system-health-design.md`,
brief `docs/briefs/system-health.md`). Inputs refreshed on 2026-10-31 from the replaced `reference/`:
`docs/route-manifest.json` has **160 admin route rows, 268 admin endpoints** (+ `GET /health` = 269; `GET /metrics`
excluded: Prometheus target, the console never calls it), the map has **66 tables** (5 new: `service_checks`,
`alert_rules`, `alert_events`, `incidents`, `job_runs`; row types regenerated), `docs/slices/` has 18 slices.
Route coverage is 269/269 (`--strict`); System health covers all 22 rows (30 endpoints). Typecheck, lint, build and
the whole suite are green; the production bundle holds no mock code. Mismatches M196–M257; assumed contracts and 36
backend questions in `docs/ASSUMED_CONTRACTS.md` § system-health. No worktrees or feature branches remain.

Commits, one per slice: foundation `0a43792`, Overview `b2fe5c6`, API `43486fd`, Orders & suppliers `1bb072b`,
Queues & jobs `91ac505`, Alerts & incidents `4ef43d5`, Data stores `93aa02c`, Integrity `0ca288d`, then one polish
commit (a shared quiet line for folded healthy items, docs).

How it was built: the foundation by 4 implementers in the main checkout and one Opus review; each tab in its own
worktree through one workflow (Sonnet implements and takes round-1 screenshots, Opus reviews code and images, Sonnet
fixes and takes round-2 screenshots), then the lead's third visual round, shared fixes and a squash merge. At most 4
implementers and 2 reviewers ran at once. Shared changes the tabs asked for went in with the first tab that needed
them (table `footer`, `MeasureValue reserveIcon`, chart axis and threshold rules, `useHealthLink`, time helpers in
`lib/time.ts`, `useJobs` fast polling while a run works, `ActionButton` reasons, the kit `Tabs` scrolling to the
selected tab). Test infra: RTL waits up to 3 s (`src/test/setup.ts`) and a test may take 15 s (`vite.config.ts`).

Open follow-ups (none blocks the page):
- The backend questions of `docs/ASSUMED_CONTRACTS.md` § system-health; then adjust `types/`, `api/` and `mocks/`.
- `HealthCard` builds an empty header bar for a card without a title once data is stale (every card has a title now).
- "Open" alerts are two reads until `GET /admin/alerts` takes `open=true` (backend question).
- The integrity mock reports a running run only through `running`; the tab falls back to the start time it got.
- The mocks seed no disabled or paused supplier; those rows are covered by tests, not by a scenario.

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
| system-health tabs | 21: per tab 3 (implementer, Opus reviewer, fix round). Third visual round and merges by the lead. |
| **Total** | **83 / 120** |

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
| 17 | system-health | `/system-health` | health | 22 | 30 | done | 26 (foundation 5, tabs 21) | `0a43792` … `0ca288d` (8 slices) + polish |

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

- merchants: the wallet adjustment sends no `Idempotency-Key`; the backend accepts one (a retry then posts once). The submit
  button is disabled while a request runs, so only a manual retry after a lost answer can post twice.
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
