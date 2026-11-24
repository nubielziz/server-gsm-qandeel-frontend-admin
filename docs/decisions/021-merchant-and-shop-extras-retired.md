# 021 Merchant and shop extras are retired

**Context.** The owner decided on 2026-11-23 to retire a set of features that the business does not use: the approval step of a
merchant account, commissions and referrals, outgoing webhooks to merchants and the REST API v1 for merchants, the abandoned-checkout
page with its reminder e-mails, Telegram for merchants and campaigns, the free IMEI check with two risk signals and the customer risk
level, the satisfaction survey and the typing indicator of support tickets, the per-device session list of a merchant, the automatic
rank promotion with its upgrade threshold, and a few fields nothing writes any more. The backend removes them after the console (and
the shop) stop using them, so the console works against the backend before and after that change.

**Decision.** The console drops each feature and keeps what is listed with it.

- **Approval of a merchant account.** Gone: the Pending approval tab of the merchants list and its count, the header words "N waiting
  for approval", the Approve column and button, the Decline mode of the suspend dialog, the Approve account and Decline buttons of a
  merchant's page, the dashboard row about merchants waiting for approval and the sidebar count of the Merchants entry. The Invite
  dialog and its toast say the account is active at once; the list shows "Invitation pending" until the password is set. Kept: an
  account whose status is still `pending` (made before the change) shows its status, a "Not active yet" banner and one action,
  "Activate account" (the same `PATCH status: 'active'` Approve sent). The status value `pending` stays dormant until the accounts
  merge removes it, with the campaign audience choice for merchants that are not active yet. The demo seed keeps one such account.
- **Commissions and referrals.** Gone: the Commissions page (accruals, agents, plans) with its sidebar row, palette row, "g then c"
  shortcut, resource, manifest and `commissions:*` permissions, the dashboard row for accruals ready to approve, the "Commission
  accruals" job of the System health mock, the audit record type of a plan, and the referral code and "Referred by" of a merchant.
  Kept: the ledger still shows old commission entries (journal kind, account and ref type) and the audit log its old rows, by their
  stored words. `/commissions` (any query) opens Finance.
- **Outgoing webhooks and the REST API v1 for merchants.** Gone: the Webhook deliveries tab of Settings (tab, drawer with Retry, three
  API functions, resource, mocks, `webhooks:read` and `webhooks:update`), the outgoing row of the Webhooks card of System health, the
  mock queue `webhooks.out`, the Scopes box of the New API key dialog and the scopes of a key, and the "Merchant API v1" surface of the
  System health mock. Kept: API keys as Dhru credentials (allowed addresses, expiry, limit; a new key is sent with `scopes: ['dhru']`
  so a backend that still asks for a list accepts it), the callbacks of payment gateways (their secrets, the card row, the "Incoming
  webhooks" surface and its alert metric), the IP rule and maintenance scopes named "API", and the words "REST API" for old orders
  whose source is `v1`. `/settings?tab=webhooks` opens the first tab.
- **Abandoned checkouts and Telegram.** Gone: the Abandoned checkouts page (feature folder, sidebar row, resource, palette row,
  `growth:read` and `growth:send`, mocks), the reminder policy and the `checkout.abandoned` template; Telegram on a merchant's page,
  as a campaign channel (with its counters and the "merchants only" rule), as a template channel and as a filter of the notification
  log. Kept: the sales funnel, now the "Sales funnel" report of Finance > Reports (`reports:growth`, 7, 30 or 90 days) with the steps
  Started a payment, Paid, Delivered, and the dashboard's storefront funnel, both without the IMEI-check step; e-mail and the inbox;
  Telegram as a channel of staff alert rules in System health; the stored channel word of old tickets, campaigns and log lines.
  `/checkouts` opens the funnel report (`?days=7|90` becomes `&range=7|90`).
- **Free IMEI check, two risk signals and the customer risk level.** Gone: the IMEI checks tab of Risk & checks with its resource and
  two API functions, the policies "Check the IMEI before payment" and "Keep the IMEI for", the IMEI retention box of the System tab,
  the "IMEI storage" row of a customer, the "Expired data cleanup" job of the System health mock (it erased old checks), the rule
  "Block blacklisted IMEIs before payment", the signals "VPN or proxy IP" and "IMEI was checked blacklisted before" in the demo data,
  and the risk level of a customer (the Flagged tab, the Risk column with its sort and filter, the badges, the "Risk level" row).
  Kept: blocked status, Block and Unblock, the blocklist, the held-orders queue with its score and signals, risk screening of
  payments. `/risk?tab=checks` opens the review queue, `/customers?tab=flagged` opens All and `?sort=riskLevel` the default sort.
- **Support extras.** Gone: the rating of a resolved ticket, the survey sentences, the Satisfaction figure of the dashboard's
  storefront panel, the unused star widget, and the typing indicator (sending `POST /admin/support-tickets/:id/typing`, listening to
  `ticket.typing`, the typing lines and the pencil on a row). Kept: Seen marks, the live stream of messages and rows, desktop alerts
  and sound, attachments, reply templates.
- **Merchant extras and dead fields.** Gone: the open-sessions table of a merchant's Security tab with End per row, the Merchants
  switch and Type column of the Access page's Sessions tab, the upgrade threshold of a group (dialog, table, types, mocks), the
  buyer's note of an order, the order source word "Admin console", the invoice kind "statement" and the event `deposit.approved` in the
  mock templates. Kept: the count of open sessions and "Sign out everywhere" on a merchant, the staff Sessions tab (staff only: it sends the
  `subjectType=staff` filter, never `subjectId`, so the server's total and pages count staff only), ranks set by hand; an old order or invoice that still carries a retired word shows it as
  written or as plain words.

**Demo seed.** `scripts/retired-seed.mjs` and `scripts/retired-seed-risk.mjs` take the retired data out of the demo's captured
state (pending merchants but the legacy one, commission plans, accruals and referrers, ticket ratings, the checkout reminder with its
policy and the recovery word of each checkout, the customers' risk word, the two signals, the blacklisted-IMEI rule, the two IMEI
policies and the IMEI check log); `seed:extract` applies the same steps, so a later extract cannot bring them back.

**Compatibility.** Release order: console first, backend last. The console never calls the retired routes and ignores the retired
keys an older backend still sends (`merchants_pending` and `commissions_accrued` attention rows, `navCounts.merchants`,
`referralCode`, `referredBy`, `telegramLinked`, the Telegram counters and templates, `outgoing` of the webhooks health, key
`scopes`, `imeiChecks` of a funnel, `riskLevel`, `blockBlacklistedImei` (a save of the rules sends it back unchanged), the settings
`abandonedMinutes`, `imeiPrecheck` and `imeiRetentionDays`, `csatScore`, `satisfaction`, `ticket.typing` events, merchant
session rows, `earnThreshold`, `clientNote`); a backend that has removed them changes nothing. A stored role that still holds a
removed permission shows it under "Other entries" until the backend strips it. Tests cover each old address and each ignored key.

**Generated files.** `scripts/check-route-coverage.mjs` lists the 20 retired routes of the map as excluded with this decision as the
reason, and `docs/feature-plan.json` no longer assigns them, so `docs/ROUTE_COVERAGE.md` and `docs/slices/` (regenerated) stay at
100% coverage. `src/lib/api/schema.gen.ts`, `docs/route-manifest.*` and the English description files mirror the read-only map and
keep its rows until the map changes. `src/mocks/liveRoutes.gen.ts` lists what the backend serves and is regenerated by
`npm run mocks:live` after the backend removes the routes.

**Consequences.** Sixteen pages in the sidebar, twelve "g then" shortcuts, five scheduled jobs and seven queues in the System health
mock, five storefront policies. Rows M280 to M299 of `docs/MISMATCHES.md` record the changes; the rows they supersede are marked.
