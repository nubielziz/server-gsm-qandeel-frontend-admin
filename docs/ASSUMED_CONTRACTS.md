# Assumed contracts

What the console assumes where the API map gives no body, field or parameter, per feature, with the questions for the
backend team. Each item is also marked "Assumed contract" in the feature's JSDoc. Moved here from each feature's
HANDOFF.md at merge time.

## dashboard

Everything below is marked "Assumed contract" in the JSDoc of `types/index.ts` and `api/dashboard.ts`.

- `GET /admin/dashboard?scope=all|b2b|b2c&days=1|7|14` returns a `Dashboard`: `generatedAt`, `stats {current, previous}`, `attention[]`,
  `queues[]` (one per service type), `suppliers[]` (all, disabled ones too), `ordersByType {daily (30 days, oldest first), monthly (12 months or null)}`,
  `revenueByChannel` (scope `all` only, else `null`), `storefront` (not for `b2b`, else `null`; always the last 30 days), `topCustomers`
  (top five by spend in the period; not for `b2b`, else `null`), `navCounts` (whole console, whatever the scope).
- Units: `successRate`, `successRate1h`, `refundRate`, `disputeRate` are percentages from 0 to 100; `medianTurnaroundSeconds`,
  `firstReplySeconds`, `overdueSeconds`, `targetSeconds` are seconds; `p50Ms` is milliseconds; `runwayDays` is days (`null`: nothing spent);
  `satisfaction.average` is out of 5; money is a 4-decimal string. Chart buckets are calendar days `YYYY-MM-DD` and months `YYYY-MM` (the console prints them in UTC).
- `stats.previous` is the period of the same length just before, or `null` when there is nothing to compare with.
- `attention` is the whole list, ranked by the server. Kinds: `orders_past_sla`, `orders_review`, `supplier_down`, `supplier_degraded`,
  `supplier_balance_low`, `services_below_floor`, `deposits_pending`, `wallets_negative`, `merchants_pending`, `commissions_accrued`,
  `orders_held`, `disputes_due`, `tickets_late`, `refunds_requested`, `refunds_failed`, `fx_stale`. Ids shown as `DP-<id>`, `T-<id>`, `RF-<id>` are plain numbers.
- `GET /admin/reports/top-clients?days=1|7|14&limit=6` returns `TopClient[]` ranked by `spend`, highest first; `walletBalance` may be negative.
- `GET /admin/queues` is a web page. It is not fetched: `queuesBoardUrl()` builds the link (MISMATCHES M8).
- The two API functions take `signal?: AbortSignal` as their second argument (as the brief says), not the `ApiInit` object the other features use.

### Questions for the backend

1. Please confirm the `GET /admin/dashboard` body, the `days` parameter (1, 7, 14) and the units above (percentages 0 to 100, seconds, milliseconds).
2. Can the `orders_past_sla` item carry the channel of the oldest order (`oldestOrderChannel: 'b2b' | 'b2c'`)? The console could then show ORD-/SF- as the demo does.
3. Is there room for a lighter counts route (or `?fields=navCounts`)? The sidebar needs six numbers and loads the whole dashboard once a minute.
4. `top-clients` is described as "by volume and by profit": is that one list sorted by spend (assumed), or two lists? Does it take `days` and `limit`?
5. Is the storefront block always the last 30 days, or should it follow `days`? Should `reports/funnel` replace it?
6. Are `ordersByType` days UTC calendar days, and does `monthly` for All include the storefront?
7. Supplier `lowBalance`: the demo calls it low below the supplier's minimum balance or with under two days of volume left at the 7-day cost rate. Is that the server's rule, and where does `successRate1h` come from?
8. Will a route to record a supplier top-up exist? Until then the balance warning links to the supplier.

## merchants

The map gives no bodies (MISMATCHES M10). Every shape below is marked "Assumed contract" in the JSDoc of its function or type.

- `GET /admin/clients`: filters `status` (`active` | `pending` | `suspended`), `groupId`, `q` (name, email, company); sort `name`, `status`. Rows are the `clients` row plus the joins `group` `{ id, name, discountPercent }` and `referredBy` `{ id, name }`, and, for staff who can read wallets, `wallet` (same four figures as below) and `stats` (last 30 days: `orders`, `spend`, `profit`, `margin` percent or null, `successRate` percent or null, `lastOrderAt`). `kycStatus` is `none | pending | approved | rejected`.
- `GET /admin/clients/:id`: same shape as a list row.
- `POST /admin/clients`: body `{ name, email, country, groupId?, creditLimit?, invite: true }`; the server emails the sign-up link and creates the account as `pending`. 409 `EMAIL_TAKEN` shows under the email field.
- `PATCH /admin/clients/:id`: body is only what changes: approve and reactivate `{ status: 'active' }`, suspend `{ status: 'suspended', reason }`, group `{ groupId }`.
- `GET /admin/clients/:id/wallet`: `{ balance, reserved, creditLimit, available }` as 4-decimal strings (see M56).
- `GET /admin/clients/:id/statement`: rows `{ id, transactionId, kind, memo, amount, balanceAfter, createdAt }`; `amount` is signed from the merchant's side (a deposit is positive); sorted with `_sort=createdAt`.
- `POST /admin/clients/:id/wallet/adjust`: body `{ amount, direction: 'credit' | 'debit', reason }` with a positive 4-decimal `amount`; answer `{ transactionId, wallet }`. Refusals (credit limit, approval limit) are problem+json shown as they come.
- `PATCH /admin/clients/:id/credit-limit`: body `{ creditLimit }`; answer the wallet.
- `GET /admin/clients/:id/api-keys`: a plain array of `ApiKeyRow` (without any secret); the console works out active / revoked / expired from `revokedAt` and `expiresAt`.
- `DELETE /admin/api-keys/:id`: no body, 204.
- `GET /admin/client-groups`: `ClientGroupRow` plus optional `merchantCount`; `kind` is `b2c_retail` for the retail group. Create body `{ name, discountPercent, earnThreshold, depositLimit, overdraftAllowed, isDefault }`; PATCH takes any of them; DELETE answers 409 while merchants are in the group.
- `GET /admin/client-prices?clientId=`: rows `ServiceClientPriceRow` plus `service` `{ id, name, type?, basePrice, floorPrice }` and `groupPrice` (the group's fixed price or the discounted base). POST body `{ clientId, serviceId, price, note? }`; PATCH `{ price?, note? }`. A price under the floor answers 422 with the message on `price`.
- `GET /admin/kyc-submissions`: filter `status`; rows `KycSubmissionRow` plus `client` `{ id, name, email, country, status }`, `reviewedBy` `{ id, name }` and optionally `files` `[{ id, filename, mime, size }]`. `POST …/decide` body `{ decision: 'approve' | 'reject', note? }` (the note is required for a rejection by the console, not assumed of the server); answer the request.
- `GET /admin/reports/client-statement/:clientId`: answers a file; the console takes the name from `Content-Disposition`.
- Private lookup for the Add override menu (no route tag, the services feature owns it): `GET /admin/services?status=active&_sort=name&_start=0&_end=200`, rows `{ id, name, type?, status?, floorPrice? }`.

### Questions for the backend

1. List rows: may `GET /admin/clients` carry the joined `group`, and (with `wallet:read`) `wallet` and the 30-day `stats`? Otherwise the table shows dashes in Wallet, Spend, Orders, Success and Last order, because one wallet call per row is too many.
2. Wallet: what do "available", "reserved" and "limit" mean exactly, and is the wallet balance a separate figure? The console assumes `balance`, `reserved`, `creditLimit` and `available` (balance plus credit limit).
3. Statement: sign of `amount`, whether `balanceAfter` is the running balance after that line, and whether `transactionId` is the id `GET /admin/ledger/transactions/:id` takes.
4. Adjustment: the answer's shape, the error codes for "past the credit limit" and "needs a second approver", and whether $10,000 is the rule.
5. Status changes: does `PATCH /admin/clients/:id` take `status` and `reason`, or are approve, suspend and reactivate separate actions? Does approving need an approved verification?
6. Invitation: is `POST /admin/clients` with `invite: true` the right shape, is `country` required, and what does the 409 `EMAIL_TAKEN` carry?
7. Groups: what is `earn_threshold` (the console calls it "Upgrade threshold": spend that moves a merchant up) and in which unit? Is `merchantCount` available? Can the retail group be edited or deleted? What is `kind` for ordinary groups?
8. Client prices: are `service` and `groupPrice` joined, is a second price for the same service a 409, and does the 422 name the `price` field? The map lists `LCUD` (no show route).
9. Verification: are `files` joined, are the status values `pending | approved | rejected`, does approving also activate the merchant or only set `kyc_status`, and is a rejection reason sent to the merchant?
10. API keys: a plain array or a paged list? Is there a status field, or are `revokedAt` and `expiresAt` the truth?
11. Official statement: PDF or CSV, and does it take a period (`from`, `to`)?
12. Dhru endpoint: is `<API base>/api/index.php` the address merchants should use?

## suppliers

The map gives routes, permissions and tables, not bodies (M10). Every function below says "Assumed contract" in its JSDoc; types are in `src/features/suppliers/types/index.ts`.

- `GET /admin/suppliers` (simple-rest, `q` searches the name): `Supplier[]`, the table's columns minus the key, plus `status` (`active` or `disabled`), `apiKeyHint`, `health`, `successRate1h`, `successRate24h`, `p50Ms`, `p95Ms`, `openOrders`, `reviewOrders`, `lowBalance`, `runwayDays` (M60, M65). Percentages are 0 to 100; unknown figures are `null`.
- `GET /admin/suppliers/:id`: a supplier plus `history` (`[{ at, successRate, medianMs }]`, 24 hourly points) and `links` (`[{ serviceId, serviceName, serviceCode, serviceStatus, supplierServiceId, supplierServiceName, priority, cost, slaMinutes, chain }]`, where `chain` is the service's whole chain `[{ priority, supplierId, supplierName, supplierServiceId, supplierServiceName }]`).
- `POST /admin/suppliers`: `{ name, driver, baseUrl, username, apiKey, currency, lowBalanceAlert?, maxConcurrency?, rateLimitPerMin?, timeoutMs? }`, answer the new supplier (detail shape). `lowBalanceAlert` is a 4-decimal money string. Field errors come as problem+json `errors[]` (`name`, `baseUrl`, `apiKey`…).
- `PATCH /admin/suppliers/:id`: only the changed fields, plus `apiKey` (replaces the stored key) and `status`. Disable and Enable send `{ status: 'disabled' }` or `{ status: 'active' }`.
- `DELETE /admin/suppliers/:id`: 204; 409 while orders or services use it, with a readable `detail`.
- `POST /admin/suppliers/:id/test`: no body, answer `{ ok, message, httpStatus, durationMs, accountName?, balance? }`. A failed test may be `ok: false` with the failure text, or an error response; the page shows either.
- `POST /admin/suppliers/:id/sync`: no body, answer `{ services, added, changed, removed, balance, balanceCheckedAt }`. 409 when the supplier is disabled or down. "Last sync" in the Connection panel is `balanceCheckedAt`.
- `GET /admin/suppliers/:id/services`: `SupplierService[]` (`id`, `supplierId`, `remoteId`, `remoteGroup`, `type`, `name`, `credit`, `time`, `isAvailable`, `lastSeenAt`, `priceChangedAt`, `imported`, `linkedServiceId`); `_start`/`_end`, `_sort=name`, `q` and the filter `imported=false`.
- `POST /admin/suppliers/:id/import/preview`: `{ supplierServiceIds }`, answer `{ items: [{ supplierServiceId, name, type, state: 'new' | 'matching' | 'changed', serviceId, serviceName, cost, previousCost, suggestedPrice }] }`. `POST /admin/suppliers/:id/import`: the same body, answer `{ created, updated, unchanged }`. The console sends only the new and changed items.
- `PUT /admin/services/:id/supplier-links`: `{ links: [{ supplierServiceId, priority }] }` (priority from 1, the whole chain, an empty list unlinks), answer the new chain `ChainStep[]`.
- `GET /admin/supplier-api-logs`: rows `{ id, supplierId, orderId | null, action, httpStatus, durationMs, error, createdAt }`, no bodies; filter `supplierId`, `_sort=createdAt&_order=desc`, the newest 25. `GET /admin/supplier-api-logs/:id`: the same plus `request` and `response` (any JSON, secrets masked by the server).
- `GET /admin/reports/suppliers?days=7`: `[{ supplierId, supplierName, orders, completed, rejected, spend, rejectionRate | null, averageSeconds | null }]`.
- Reroute uses the orders feature's contracts: `GET /admin/orders?supplierId=<id>&status=pending&status=processing&_sort=createdAt&_order=asc&_start=0&_end=200`, then `changeOrderSupplier` (`{ supplierId, resetReference: true }`) and `dispatchOrder` for each order.
- Money is shown with `$`, as the whole console does; the supplier's own `currency` and `creditRate` are only listed in the form and not used to convert.

### Questions for the backend

- Which values does `suppliers.status` take, and where do `health`, the success rates, latency percentiles, open-order counts, `lowBalance` and `runwayDays` come from? Can `GET /admin/suppliers` carry them, and `GET /admin/suppliers/:id` the 24 hourly points?
- No route lists the services linked to a supplier: is `links` on the detail right, or should `GET /admin/services` accept `supplierId`?
- Is `balance` in the supplier's own currency or in USD? What is `creditRate` for?
- `PUT /admin/services/:id/supplier-links`: is `{ links: [{ supplierServiceId, priority }] }` right, and how should the console choose the supplier service for a newly added supplier (today it lists that supplier's first 100 services)?
- Test connection: a failed test as `ok: false` or as an error response? Which fields come with a good one?
- Sync: the answer fields, and the refusal codes for a disabled or unreachable supplier.
- Import: do `matching` items need to be sent, who sets the suggested price, and what does the server do with fields (`service_fields`)?
- API log: does the list leave out `request` and `response`? Is `order_id` null for tests and syncs? Are secrets masked in both bodies?
- `GET /admin/reports/suppliers`: the period parameter and the row fields.
- Reroute: could `change-supplier` take `dispatch: true`, so a reroute is one call (the same question as for the orders feature)?
- Delete: which code and text come with the refusal when orders or services still use the supplier?

## customers

All are marked "Assumed contract" in the JSDoc of the function or type, and live in `types/index.ts`.

- `Customer` (list row): the `CustomerRow` columns with `riskLevel` `low|medium|high`, `status` `active|suspended|blocked|anonymized`,
  `suspendedReason` and `suspendedBy` nullable, plus `ordersCount`, `lastOrderAt` and an optional `currencyCode`. `createdBy` is null
  for a customer who came on their own and a staff id for one the team added.
- `GET /admin/customers/:id`: `Customer` plus `stats { orders, spent, lastOrderAt, refunds, tickets, disputes }`, `account`
  (`emailVerified`, `mustChangePassword`, `passwordChangedAt`, `resetSentAt`, `activeSessions`, `lastIp`; null for a guest),
  `latestConsents { orderId, records[{ purpose, document, at, ip }] }` (null without orders) and `risk { highestScore, signals[{ text, orderId }] }`.
  `document` is the legal document with its version, ready to show (`Terms of service v3.2`), or null.
- `GET /admin/customers` filters: `q` (name, email), `country`, `status` (repeat the key), `riskLevel` (repeat the key; the
  Flagged tab sends `medium` and `high`) and `hasAccount` (not in the brief; the header sentence needs it). Sorts: `name`, `country`,
  `hasAccount`, `ordersCount`, `totalSpent`, `lastOrderAt`, `riskLevel`, `status`.
- Bodies: create `{ name, email, country, locale, phone?, password: { mode } }` answers 201 with the customer and
  `temporaryPassword?`; `PATCH` sends only changed fields (`name`, `email`, `country`, `locale`, `phone`, `internalNotes`);
  account `{ mode }` and password `{ mode, revokeSessions }` answer `{ temporaryPassword? }` (shown once, `gcTime: 0`);
  suspend `{ reason, note? }`; block `{ blocked: true, reason }` or `{ blocked: false }`; the three give no answer the console reads;
  anonymize answers 204; export is a JSON file named by `Content-Disposition`, else `customer-<id>.json`.
- Errors: `EMAIL_TAKEN` (409) on create and edit goes under the email field; `errors[]` entries name the form's fields
  (`password.mode` is read as the Password choice). Every other problem shows in the dialog that sent the call.
- `DataRequest`: the `DataRequestRow` columns with `kind` `export|erasure`, `status` `open|in_progress|completed|rejected`,
  `handledBy` and `fileId` nullable, plus `customerName`. List filters `status` (repeat the key; the tab asks for `open` and `in_progress` unless the menu says otherwise), `kind`,
  `customerId`; sorts `requestedAt`, `dueAt`, `status` (the tab starts on `dueAt`, ascending). `PATCH` `{ status: 'in_progress'|'completed'|'rejected', note? }` answers the request.
- Exporting a customer's data or anonymising them closes their open request of that kind (M74). Anonymising also cuts
  the IMEIs and replaces the buyer on the customer's orders, so the console refreshes the orders after it.
- The command palette asks `GET /admin/customers` for the first four matches of `q` with no sort.

### Questions for the backend

1. Is the middle risk level `medium` (assumed) or `med`? Does sorting by `riskLevel` follow low, medium, high rather than the alphabet?
2. Where does a guest's last address come from? A guest has no session, so the console reads the latest consent record's address.
3. Does `POST /admin/customers/:id/block` with `{ blocked: false }` need a reason (the map says "with a reason")? What does it answer?
4. Do `GET /admin/customers/:id/export` and `POST /admin/customers/:id/anonymize` close the customer's open data request, and with which status?
5. What are the data-request statuses and allowed moves, and is the `note` of the `PATCH` kept (audit log)?
6. Is `totalSpent` the gross amount (VAT included) of the orders that were not rejected, as the demo's spend? Does `ordersCount` count every order?
7. Is `suspendedReason` stored as the reason and the note joined, or do they need two columns?
8. Which countries does the storefront accept, and is there a route the console can read them from?
9. Does `GET /admin/customers` support the `hasAccount` filter, and `GET /admin/data-requests` the `customerId` and repeated `status` filters?
10. May an anonymised customer's old email be used for a new customer?

## services

All are marked "Assumed contract" in the JSDoc of the function that carries them.

- `GET /admin/services` rows: see M91 and 2. Filters `q` (name, code, category), `type`, `status` (`active` / `disabled`), `belowFloor`, `categoryId`; sorts on `name`, `type`, `cost`, `basePrice`.
- `GET /admin/services/:id` embeds `fields`, `options` (`{ list: 'model' | 'network' | 'mep', value, label, supplierValue }`) and `groupPrices` (`{ groupId, price }`); no other route reads them.
- `POST /admin/services` `{ name, code, categoryId, type, slaMinutes, basePrice }`; `PATCH` any of those plus `minProfit`, `status`, `executionMode`; both answer the service with the figures worked out. A price under the floor is refused with a 422 field error on `basePrice` (the demo refused it too). A code that is taken is a 409 with a field error on `code`. `DELETE` answers 204, or 409 with the reason.
- `PUT /admin/services/:id/fields` `{ fields: [{ key, label, fieldType: 'text' | 'number' | 'select' | 'textarea', required, options, regex, supplierKey }] }`; `/options` `{ options }`; `/group-prices` `{ prices: [{ groupId, price }] }`. Each replaces the whole list and answers the saved list.
- `service-categories`: rows `{ id, name, type, allowedGroupIds, sort, isActive, serviceCount? }`; bodies are those fields; delete is 409 while services use the category.
- `pricing-rules`: rows `{ id, scope: 'global' | 'category' | 'service', targetId, target, groupId, group, kind: 'margin' | 'discount' | 'promo', percent, fixed, rounding: 'none' | 'nearest_0.05' | 'nearest_0.10' | 'ends_99', minProfit, priority, isActive, startsAt, endsAt }`. Blank amounts are sent as `"0.0000"`, blank dates as `null`.
- Bulk price: body `{ categoryId \| serviceIds, change: { type: 'percent' \| 'fixed', value } }` with `value` a signed decimal text (`"5"`, `"-0.25"`); preview answers `{ lines: [{ serviceId, name, code, oldPrice, newPrice, floorPrice, belowFloor }], belowFloor }`; apply answers `{ updated, belowFloor }`.
- `GET /admin/pricing/resolve?serviceId&clientId` answers `{ price, rawPrice, floor, clamped, source: 'client' \| 'group' \| 'base', cost, minProfit, margin, marginPct, steps, otherGroups? }`; a step is `{ id, label, state: 'win' \| 'apply' \| 'skip' \| 'none', value, after, note }`.
- `GET /admin/inventory-codes` rows `{ id, maskedCode, service: { id, name }, status: 'available' \| 'reserved' \| 'sold' \| 'void', orderId, batchRef, createdAt }`, filters `serviceId`, `status`. Import `{ codes: string[], batchRef? }` answers `{ imported, duplicates, rejected, batchRef? }`. Void `{ ids }` answers `{ voided, skipped }` (the console only sends codes it shows as `available`).
- Lookups: `/admin/client-groups` rows `{ id, name, kind, discountPercent, merchantCount? }`; `/admin/clients` rows `{ id, name, status?, group? }`.

### Questions for the backend

1. Which route returns a service's custom fields, option lists and group prices? We assume `GET /admin/services/:id` embeds them.
2. Does a service carry `code`, `slaMinutes`, `minProfit`, `floorPrice`, `marginPct`, `belowFloor`, `costChangedFrom` and the supplier names? Is `executionMode` the `fulfillment` column?
3. Does `belowFloor=true` mean active and disabled services both? (The header count adds `status=active`.)
4. Is a price under the floor refused on save (422), or saved with orders charged the floor? And what does bulk apply do with a price that would fall under it?
5. `allowedGroupIds` empty: visible to every group? Is there really no parent category?
6. Pricing rules: the kinds, whether percent and fixed are signed, the rounding values, the dates (`starts_at` / `ends_at` are not in the table) and what priority decides.
7. The resolve answer: the step shape (fractions for category and discount), `otherGroups`, and where `cost` and `minProfit` of the floor row come from.
8. Inventory: the masked field name, the status values, whether import takes `codes` or raw text, and whether `reserved` codes may be voided.
9. Is the Floor policy text true (minimum profit defaults to 6% of cost, at least $0.02)? It is the demo's copy, kept as it is.
10. Does `GET /admin/client-groups` need `groups:read`, and does a group price for the Retail group belong in this PUT or on the storefront page?

## risk

All bodies are assumed (M10); each is marked "Assumed contract" in the JSDoc of its function in `api/`.

- `GET /admin/risk/queue` answers `{ held: HeldOrder[], stats?: { decided30d, approved30d, refunded30d, heldShare }, recent?: DecidedOrder[] }`. A `HeldOrder` has `orderId`, `paidAt`, `score`, `service`, `supplier`, `imei`, `device`, `capturedAmount` (USD with VAT), `currency`, `fxRate`, `paymentMethod` (`card`, `wallet`, `crypto`), `signals` (strings) and `customer` (`id`, `name`, `email`, `country` code, `riskLevel` `low|medium|high`, `history: { earlierOrders, refunds, disputes }`). `heldShare` is a percent number.
- `POST /admin/risk/orders/:id/approve`: no body; the answer is not used. `POST .../refund`: `{ reason?, blockEmail?, blockDevice? }`; the answer is not used. A decision on an order that is no longer held answers `409`; the console shows the server’s message.
- `GET /admin/imei-checks` (`/:id`): rows with `id`, `imei` (digits, or a hash or mask after retention), `brand`, `model`, `checkType` (`blacklist|basic|icloud|sim_lock`), `status` (`clean|blacklisted|locked|unknown`), `source` (`pre_order|storefront_free`), `country`, `ip`, `cost`, `price`, `cachedUntil`, `createdAt`, `orderId`, `customer`, `supplier`, `result` (free-form object). Filters `checkType`, `status`, `source`, `q` (IMEI, brand, model); sort `model`, `checkType`, `status`, `createdAt`.
- `GET /admin/blocklist` (`/:id`): rows with `id`, `kind`, `display`, `reason`, `expiresAt`, `source` (`manual|auto|chargeback`), `createdBy` (`{ id, name }` or null for the system), `createdAt`. Filter `kind`; sort `kind`, `display`, `createdAt`. `POST` body `{ kind: email|domain|imei|card, value, reason }` (an IMEI as 15 digits), answer the new entry (201). `DELETE` answers 204.
- `GET` and `PUT /admin/risk/rules`: `{ rules: [{ id, on, value, label?, hint?, unit? }] }`; `PUT` takes `{ rules: [{ id, on, value }] }` (the whole set) and answers the saved rules. A field message is keyed by rule id (`reviewThreshold`), by path (`rules.reviewThreshold.value`) or by index (`rules.1.value`).

### Questions for the backend

1. What does `GET /admin/risk/queue` send: only the held orders, or also the 30-day figures and the latest decisions (`stats`, `recent`)? Are signals plain strings or `{ label, points }`?
2. `POST .../refund`: are `reason`, `blockEmail` and `blockDevice` the right body? Does blocking the email also set the customer to `blocked`? Is "device" the order's IMEI or a device fingerprint?
3. Rules: which ids and which units? Does `PUT` replace the whole set (then two editors can overwrite each other; is there a version or `If-Match`)? Which field name carries the "review below block" message?
4. Blocklist: does `POST` take `value` (and derive `display`) or `display`? Which code answers a duplicate? Can the console set `expiresAt`? Can system entries (chargebacks) be removed?
5. IMEI checks: what does `imei` look like after the retention period (hash, mask, null)? Can the list send the 30-day figures (conversion to an order, lookup cost) in a header or a summary route? Which sort fields and filters are supported?
6. Permissions: are blocklist create and delete `risk:create` and `risk:delete`, and does the rules `PUT` need the literal `risk:*`?
7. Does approve or refund return the updated order?

## refunds

All of these are marked "Assumed contract" in the JSDoc of `api/` and typed in `types/index.ts`; the map gives the tables, not the bodies.

- Lists `GET /admin/refunds`, `GET /admin/disputes`: simple-rest (`_start`, `_end`, `_sort`, `_order`, `status`), total in `x-total-count`.
  - `Refund` = `RefundRow` plus `status` (`requested | completed | failed | rejected`), `method` (`original | manual`), `currency` (ISO code) and `fx` (the rate the order was priced with, display only), `partial`, `gatewayRefundId | null`, `note | null` (gateway failure or the message the customer got), `requestedBy { type: customer | staff | system, name }`, `approvedBy { id, name } | null`, `customer { id, name } | null`, `order { id, deliveredAt, cost }`, `payment { id, method, brand, amount, taxAmount }` (amount = what was paid, VAT included), `netAmount` and `taxAmount` (the split, null until completed). Money is USD.
  - `Dispute` = `DisputeRow` plus `status` (`needs_response | under_review | won | lost`), `currency`, `fx`, `note`, `customer`. Only `GET /admin/disputes/:id` carries `evidence[] { key, title, body, ok }` and `strength` (`strong | fair | weak`); the list leaves them out.
- `POST /admin/refunds/:id/approve` body `{ amount? }` (4-decimal string; left out means the amount on the request); answer the updated refund (an empty answer works). Refusals: 409 (`REFUND_NOT_PENDING`), 422 with `errors[{ field: 'amount' }]`.
- `POST /admin/refunds/:id/decline` body `{ reason }` (field error on `reason`); `POST /admin/refunds/:id/retry` no body. Answer the updated refund.
- `POST /admin/disputes/:id/evidence` body `{ items: string[], note? }` (`items` are the `key`s of the pack); `POST /admin/disputes/:id/accept` no body. Answer the updated dispute. Refusals: 409 (`DISPUTE_NOT_OPEN`, `EVIDENCE_DEADLINE_PASSED`), 422.
- `GET /admin/reports/payments?method=card|wallet|crypto&_start&_end&_sort&_order` answers `{ methods[], payments[], total, totals }`:
  - `methods[] { method, payments, volume, fees, feeRate (percent), refunds, disputes }`, always for all three methods.
  - `payments[] { id, orderId, amount, feeAmount, createdAt, method, brand, status (captured | refunded | partial_refund | disputed | chargeback), currency, fx, customer }`: one page, newest first unless sorted.
  - `total` = payments that match the method; `totals { refundedCount, refundedAmount, refundedPercentOfSales, awaitingAmount, chargebackLoss }` for the strip (last 30 days for the first three; all time for the loss).
- The id shown is the API id with the demo's prefix: `RF-`, `DP-`, `SF-` (as MISMATCHES M32).

### Questions for the backend

1. Does `/admin/refunds` also return merchant (client) refunds? The table has `clientId`; this page shows customers only and prints "Unknown" for a refund without a customer.
2. Report shape: is the method comparison plus one page of payments plus totals in one answer right? The route text also names "net amount and settlements"; the demo's tab has no place for them, so they are not read. Should the page's totals (30-day refunds, awaiting amount, chargeback loss) come from this report or from another route?
3. Approve: is the amount left out = the amount on the request? What is the upper limit (what was paid minus earlier refunds)? Does the answer carry the revenue / VAT split (`netAmount`, `taxAmount`)?
4. Crypto payments: the demo says "mark it as paid after you send the USDT yourself". Approve records it as paid out by hand (`method: manual`); is there a separate "mark as paid" step?
5. Evidence: does the server build the pack and its strength, and what does the submit body look like? The console cannot attach files (`evidenceFileIds`); is that done on the server from the order record?
6. Does accepting a loss block the customer (the demo says it does; the map's tables do not include customers)?
7. Default order of disputes: the demo sorts by evidence deadline, soonest first, which puts old closed disputes (past deadlines) before the open ones once there are many. Can the server list `needs_response` first when asked for `_sort=evidenceDueAt&_order=asc`?
8. Is `fee` per dispute (the demo always has $15)? Is `fx` the rate the order was priced with?

## finance

The map gives no bodies (M10). Each is in one function's JSDoc marked "Assumed contract"; the types are in `types/`.

- `GET /admin/ledger/transactions`: extra filters `kind`, `accountKind` (an entry with a line on an account of that kind) and `q`. `LedgerRefType` now also has `payment`, `accrual`, `supplier`, `system` (the demo seed uses them).
- `GET /admin/ledger/accounts` returns the trial balance: `{ currency, rows: [{ kind, balance, accounts }], totalDebit, totalCredit }`, one row per account kind, `balance` signed (positive is a debit), `accounts` the number of ledger accounts of that kind (one wallet account per merchant).
- `POST /admin/ledger/reconcile`, no body, returns `{ ranAt, accountsChecked, entriesChecked, differences: [{ accountId, kind, ownerName, stored, expected, difference }] }`; an empty list means all matched.
- `GET /admin/payments`: filters `purpose` (`topup`, `order`), `status` (`pending`, `approved`, `rejected`), `q`; sort `createdAt`, `id`, `amount`, `status`. Row = `PaymentRow` plus `netAmount`, `client { id, name, group, walletBalance }`, `gateway { id, name }`, `reviewedBy { id, name }`, `reviewedAt`, `note` (a hint to the reviewer while pending, the reason once rejected), nullable `invoiceId` and `receiptFileId`. `methodType` is `bank`, `card`, `usdt` or `wise`.
- `GET /admin/payments/:id`: same row. `POST /admin/payments/:id/approve`: no body, returns the updated payment. `POST /admin/payments/:id/reject`: `{ reason }`, returns the updated payment.
- `GET /admin/invoices`: filters `status`, `kind`, `q` (number or merchant name); sort `createdAt`, `total`, `status`. Row = `InvoiceRow` plus `currency` (code), `client { id, name }` or `customer { id, name, email }`, nullable `orderId` and `pdfFileId`, `description`. `POST /admin/invoices`: `{ clientId, amount, description }` (amount a 4-decimal string), returns the invoice; the server adds tax and numbers it.
- `GET /admin/reports/profit?groupBy=day|service|supplier|client&from=YYYY-MM-DD&to=YYYY-MM-DD` returns `{ groupBy, from, to, currency, rows: [{ key, label, orders, revenue, cost, profit }], totals }`; for `day` the `key` is the date.
- `GET /admin/reports/wallet-exposure` returns `{ currency, totals: { clients, balance, reserved, overdraftLimit, overdraftUsed, inOverdraft }, rows: [{ clientId, name, balance, reserved, overdraftLimit, overdraftUsed }] }`, largest wallets first.
- `GET /admin/reports/vat?from=&to=` returns `{ from, to, currency, rows: [{ country, period (YYYY-MM), rate (percent), orders, taxable, vat }], totals: { orders, taxable, vat } }`.
- The console writes the dates of the presets (last 7, 30, 90 days; this or last month or quarter) in the browser's time zone.

### Questions for the backend

1. Is there a ledger export (CSV) route, with its own permission and an audit entry? Without it the console has no export (M125).
2. `GET /admin/ledger/accounts`: does it return one line per account kind (as assumed) or one per account? Which currency do the totals use?
3. Ledger list: which fields does `q` search (journal number, memo, merchant name, reference)? Is there an `accountKind` filter? What `ref_type` do deposits carry (`payment` here)?
4. Reconciliation: does it only report, or also correct? Can it run long (should the answer be a job)? Does it also check that every entry sums to zero?
5. Payments: the `status` values of a manual deposit, the `note` field's meaning, whether `approve` returns the payment with the wallet, and whether `approve` needs an idempotency key.
6. Invoices: the `kind` and `status` words; there is no description column in `invoices`, so where does a manual invoice's text go? Does a manual invoice get VAT, and can it carry a due date?
7. Reports: the parameter names and the time zone of `from`/`to`; how many rows the wallet exposure caps at; whether VAT rows are split by month.

## checkouts

The map gives routes, permissions and tables, not bodies (M10). Marked "Assumed contract" in the JSDoc of `api/` and `types/index.ts`.

- `GET /admin/checkouts/abandoned`: simple-rest list (`_start`, `_end`, `_sort`, `_order`, `q`, total in `x-total-count`). Filter `canRecover=true`. Sort fields `createdAt`, `grossAmount`, `recoveryEmailedAt`. Row `AbandonedCheckout`: `id`, `email` (masked), `grossAmount` (4-decimal USD string), `fxRate`, `currencyCode`, `serviceName`, `status`, `utm` (object, `utm.source` shown), `createdAt`, `recoveryEmailedAt | null`, `orderId | null`, `marketingConsent`, `canRecover`.
- `POST /admin/checkouts/recover`: body `{ ids: number[] }`; answer `{ sent: number, skipped: [{ id, reason }] }`. Known reason codes: `no_marketing_consent`, `already_emailed`, `already_paid`, `not_found`; any other code is shown with underscores as spaces. 422 with a message on `ids` for an empty list. The console sends only ticked rows with `canRecover`.
- `GET /admin/reports/funnel?days=7|30|90` (default 30): answer `{ days, imeiChecks, paymentStarted, paid, delivered }`, all integers.
- The "recovered" word: a row with `recoveryEmailedAt` and `orderId` set.

### Questions for the backend

1. List: is `GET /admin/checkouts/abandoned` a simple-rest list with `x-total-count`, does `q` match the full address (the rows come masked), and are `serviceName`, `currencyCode` and `utm` joined?
2. What exactly makes `marketingConsent` true (the latest `consent_records` row with purpose marketing is a grant)? What if consent is withdrawn after the email went out?
3. What exactly is `canRecover`: consent, no email sent, not paid, and past the automatic-reminder delay? Is there a maximum age (an expired basket link)?
4. Recover: is `{ ids }` right, what are the skip reason codes, is there a maximum number of ids per call or a rate limit, and does the send write an audit entry (the demo logs "sent recovery emails")?
5. Does the automatic reminder (after the `abandonedMinutes` policy) follow the same consent rule and set `recoveryEmailedAt`? Is "recovered" a payment within 3 days of the email (the demo's tooltip)?
6. Funnel: which periods are allowed, are the counts people or events, is it storefront-only, and should it replace the dashboard's `storefront` block (M39)?
7. Do you want a `summary` on the list (left at checkout, not reminded, recovered, revenue recovered) so the demo's figures strip can come back (M136)?

## support

Every one is marked "Assumed contract" in the JSDoc of `api/*.ts` and typed in `types/index.ts` (MISMATCHES M10).

- `GET /admin/support-tickets` (list): rows are the `support_tickets` columns with the words narrowed (`status` new / open / pending / resolved, `priority` high / normal / low, `channel` email / web / chat / telegram, `category` as the demo's `TICKET_CATS`, `requesterType` customer / client) plus joined `requester { name, email }`, `assignee { id, name }`, `orderId` (null when none) and the timers `lastPublicAt`, `slaDueAt`, `late`. Filters: `status` (repeated key), `late`, `assigneeId`, `requesterType`, `requesterId`, `q` (number, subject, requester name). Sort fields: `late`, `updatedAt`. The figures are `_start=0&_end=1` calls read from `x-total-count`.
- `GET /admin/support-tickets/:id`: the list row plus `messages[]` (oldest first: `id`, `authorType` customer / client / staff / system, `authorId`, `authorName`, `body`, `isInternal`, `fileIds`, `createdAt`) and `replyChannels` (`email`, `telegram`). The map has no messages route, so the thread rides on the show answer. 404 for an unknown id.
- `PATCH /admin/support-tickets/:id`: body `{ priority?, assigneeId? (null clears), status? }` where `status` is `resolved` (Resolve) or `open` (Reopen); answer the updated row. Resolving writes an internal "Marked resolved by …" message and sends the satisfaction survey (server side).
- `POST /admin/support-tickets/:id/reply`: body `{ body, channel? }`, answer 201 with the new message. A new or open ticket becomes `pending`, the first public reply sets `firstResponseAt`, an unassigned ticket goes to the sender. 409 `TICKET_RESOLVED` for a resolved ticket; 422 with `errors[{ field: 'body' }]` for empty text.
- `POST /admin/support-tickets/:id/note`: body `{ body }`, answer 201 with the new internal message; the status stays.
- `GET /admin/reply-templates`: rows `{ id, title, category, locale, body, shortcut, createdBy, createdAt, updatedAt }`, `body` raw with `{{name}}`, `{{order}}`, `{{eta}}`. The console loads up to 200 sorted by `title`.
- `POST /admin/reply-templates` `{ title, category, locale, body, shortcut }` (201), `PATCH` with the changed fields only, `DELETE` (204). Refusals: 422 with a message per field (the mock refuses a shortcut that does not start with `/`), 409 `SHORTCUT_TAKEN` (shown under the Shortcut field).
- Permissions: page `support:read`; priority, assignee, Resolve / Reopen need `support:update`; reply and note need `support:reply`; templates need `support:create`, `support:update`, `support:delete` (M7).

### Questions for the backend

1. Do list rows join `requester { name, email }` and `assignee { id, name }`, and do they carry `late`, `slaDueAt` and `lastPublicAt`? Is `late=true` an accepted filter and `late` a sort field? Without them the Overdue filter and the sort cannot be server-side.
2. Does `GET /admin/support-tickets/:id` embed the messages (there is no messages route in the map)? Which channels does `replyChannels` list, and does `POST …/reply` take `channel`?
3. Stats for the strip: median first reply and the satisfaction average (needs a stats route or a header on the list). Until then the strip shows open, past reply target and resolved.
4. What does `PATCH` accept for `status` (we send `resolved` and `open`)? Does resolving write the "Marked resolved by …" note and send the survey itself?
5. Template variables: is `{{name}}` / `{{order}}` / `{{eta}}` the syntax, and does the server also render them on send? Which `locale` values exist (the console offers `en` and `ar`)? What is `shortcut` for: should typing `/refund` in the composer expand the template?
6. `GET /admin/staff` needs `staff:read`; should a support agent be able to read a short staff list (names only) to assign tickets without it?
7. Is there an event stream for new customer messages? The console asks again every 30 seconds (inbox, open thread, figures).

## commissions

All bodies and answers are assumed (M10); each function says so in its JSDoc.

- `GET /admin/commission-plans`, `/:id`: rows are the generated plan columns with `kind` of `referral` or `rebate`; `percent` is a percent string ("3.0000" is 3%); `tiers` is a free JSON object.
- `POST /admin/commission-plans`: `{ name, kind, percent, basis, period, tiers, isActive }`, answer the plan. `PATCH`: any of those fields, answer the plan. `DELETE`: no body, 204; 409 for a plan that agents are assigned to.
- `GET /admin/commission-assignments`, `/:id`: rows are the generated columns plus the joins `beneficiary { id, name, country? }` and `plan { id, name, percent }`.
- `POST /admin/commission-assignments`: `{ beneficiaryId, planId }`, the server sets `scope` and `startsAt`; answer the assignment. `PATCH`: `{ planId }`. `DELETE`: ends the assignment, 204.
- `GET /admin/commission-accruals`, `/:id`: rows are the generated columns plus `ledgerTxId` that is null until paid, and the joins `beneficiary { id, name }` and `merchant { id, name }` (the referred merchant). Filters: `status` (`accrued`, `approved`), `beneficiaryId`, `createdAt_gte`. Sort: `createdAt`, `basisAmount`, `percent`, `amount`, `status`. A status the console does not know is shown as sent.
- `POST /admin/commission-accruals/approve`: `{ ids }`, answer `{ approved, total, skipped: [{ id, reason }] }`.

The mock (`mocks/`) plays the server: it keeps the demo's 0.5 to 15 rate limit and refuses a plan that has agents, a merchant that already has a plan (409 `ALREADY_ASSIGNED`) and ids that do not exist. Approving marks the accruals approved, sets `ledgerTxId` and posts one `commission` journal per agent into the mock ledger (`ledgerStore`, `refType: 'accrual'`, as the demo's seed journals have). It does not move the merchants mock's wallet balance (that store belongs to the merchants feature).

### Questions for the backend

1. Approve: is the body `{ ids }` and the answer `{ approved, total, skipped: [{ id, reason }] }`? Does it skip an accrual that is not ready, or fail the whole request? Does it enforce the 7-day wait ("Normally approved after 7 days to cover refunds. You can approve earlier.") or only warn?
2. Accrual list: does it join `beneficiary` and the referred `merchant`? Which filters and sort fields does it accept (`status`, `beneficiaryId`, `createdAt_gte`)? Are there statuses besides `accrued` and `approved` (reversed, void)?
3. Is there a summary read (for example `GET /admin/commission-accruals/summary`) with the ready amount and agent count, the approved and earned amounts over a period, and commission as a share of the referred revenue? The strip shows dashes for these until there is one, because the console adds no money itself.
4. Is there an approval date? The strip's "Approved, 30 days" would be exact with `approvedAt` on the row (today it counts accruals earned in 30 days that are approved).
5. Plans: the values of `kind`, `basis` and `period`; what `percent` is ("3.0000" for 3%?) and its allowed range; the shape of `tiers` (a minimum payout, brackets?); whether a fixed amount instead of a rate is possible.
6. Assignments: values of `scope`; can a merchant have more than one plan; does `DELETE` end the assignment (set `ends_at`) or remove the row; is it refused while accruals are ready? Could the row carry per-agent figures (referred count, 30-day revenue, ready and approved amounts) for the Agents tab?
7. Does approving credit the wallet and post the journal in one transaction, and does it also change the merchant's wallet figures the merchants page shows?

## settings

The map gives routes, permissions and tables but no bodies (MISMATCHES M10). Each item is marked "Assumed contract" in the JSDoc of its
function or type (`api/*.ts`, `types/*.ts`).

- `GET /admin/payment-gateways[/:id]`: `PaymentGatewayRow` with `audience` `b2c | b2b | both`; may carry `secretHint` (never a secret) and
  `volume30d`. `POST` body: `code`, `driver`, `name`, `audience`, `feePercent`, `feeFixed`, `minAmount`, `maxAmount`, `allowedGroupIds`,
  `supportsRefunds`, `supports3ds`, `isManual`, `instructions`, `holdHours`, `isActive`, optional write-only `secret`. `PATCH` takes any of
  them (the switch sends `{ isActive }`; `secret` replaces the stored one). A zero minimum or maximum means no limit. `DELETE` answers 204,
  or 409 for a gateway that took payments.
- `GET /admin/tax-rates[/:id]`: `TaxRateRow`, several rows per country. `POST` body: `country`, `region`, `ratePercent`, `taxType`
  (`vat`, `gst`, `sales_tax`, `none`), `appliesTo`, `validFrom`, `validTo`, `label`, `ossScheme`. `PATCH` takes any of them.
- `GET /admin/currencies[/:id]`: `CurrencyRow`, optionally `isStale`. `POST` body: `code`, `name`, `rateToBase`, `markupPercent`,
  `charmRounding`, `isStorefront`, `decimals`. `PATCH` takes any of them (the switch sends `{ isStorefront }`).
- `POST /admin/currencies/refresh-fx`: no body; answer `{ refreshed?: [{ code, rateToBase, rateUpdatedAt }], failed?: [{ code, message }], source? }`.
- `GET /admin/settings`: one flat object. Policy keys: `guestCheckout`, `require3ds`, `withdrawalWaiver`, `autoRefundFailed`,
  `imeiPrecheck` (booleans); `refundHoursBeforeDispatch`, `abandonedMinutes`, `imeiRetentionDays` (whole numbers). `PATCH
  /admin/storefront/settings`: body is those keys (only the ones that change); answer the policy keys after the change; a field error
  names the key.
- `GET /admin/notification-templates[/:id]`: `NotificationTemplateRow` with `channel` `email | telegram`, `audience` `customer | merchant |
  staff`; filters `audience`, `channel`; may carry `sentLast30Days`. `POST` body: `event`, `channel`, `audience`, `locale`, `subject`,
  `body`, `isActive`; a second template for the same event, channel, audience and language is a 422 on `event`. `PATCH` takes any of them.
- `POST /admin/notification-templates/:id/preview`: body `{ subject?, body? }` (empty: preview the saved text); answer `{ subject, body,
  format?: 'text' | 'html', from?, note? }`. Without `format` the console guesses from the markup.
- `GET /admin/notifications[/:id]`: rows with `event` (key), `channel`, `status`, `recipient` (masked), `sentAt`, `createdAt`; the detail
  adds `payload` and `error`. Filters `status`, `channel`.
- `GET /admin/webhook-deliveries[/:id]`: rows with the joins `endpoint { id, url }` and `client { id, name }`; the detail adds
  `responseBody` and `error`. Filters `status`; `q` searches merchant, event and address.
- `POST /admin/webhook-deliveries/:id/retry`: no body; answer the delivery after queuing; 409 `DELIVERY_SUCCEEDED` for one that worked.

### Questions for the backend

1. `GET /admin/settings`: are the policy keys named as in "Assumed contracts" (`guestCheckout`, `require3ds`, `withdrawalWaiver`,
   `autoRefundFailed`, `imeiPrecheck`, `refundHoursBeforeDispatch`, `abandonedMinutes`, `imeiRetentionDays`)? Does the answer carry the
   other keys (as `{ key: value }`) so the System tab can show them?
2. `PATCH /admin/storefront/settings`: is the body a flat set of policy keys? The map says it also changes payment methods and email
   templates; should the console send those through it (and with which body), or through their own CRUD routes as it does now?
3. Gateways: are `audience` values `b2c | b2b | both`? Is a zero limit "no limit"? What does `holdHours` hold (the time a manual payment
   waits)? Can the server send `secretHint` and `volume30d`? Is `code` fixed after creation?
4. Currencies: is `rateToBase` units of the currency per dollar? Will the list carry `isStale`? Is `settings:update` really the
   permission to read the list? What does `refresh-fx` answer (updated, failed, source), and can it refresh one currency?
5. Templates: what are the event keys (the console asks before turning off `order.received`, `order.completed`, `order.failed`)? Does the
   preview take `subject` and `body` to preview unsaved text, and does it say `format`? Are templates ever HTML?
6. Notification log: is `recipient` sent already masked? Which `status` values exist? Is `event` the event key rather than an id?
7. Webhook deliveries: are `endpoint` and `client` joined into each row? Which `status` values exist? Does the detail carry the merchant's
   `responseBody` and a network `error`? Does a retry make a new attempt at once, and is it rate limited?
8. Tax rates: should two rates for one country be refused when their dates overlap? Which `taxType` values exist?

## storefront

All marked "Assumed contract" in the JSDoc of `api/*.ts` and `types/*.ts`.

- **Listings** (`/admin/service-listings`): a row is the generated row (`id`, `serviceId`, `locale`, `slug`, `publicTitle`, `isListed`, `isFeatured`) plus `service { id, name, code, basePrice, cost }`, `retailPrice` (or `null`), `floorPrice`, `marginPct`, `orders30d`, `revenue30d`, `locked`, `lockedReason`. Filters `q` (title, slug, service name or code), `isListed`, `locked`; sorts `publicTitle`, `isListed`. `POST` body `{ serviceId, locale, publicTitle, slug? }` (no slug: the server makes one). `PATCH` body any of `{ isListed, retailPrice }`; a price under the floor and a locked or disabled service are refused, with `errors[]` on `retailPrice` for the price.
- **Content pages** (`/admin/content-pages`): `kind` is `carrier`, `model`, `tool`, `brand`, `country` (landing) or `static`, `blog`; `status` is `draft`, `published` or `noindex`; rows carry `bodyMd` and, for landing pages, `visits30d` and `orders30d` (else `null`). The `kind` filter may repeat. Filters `q`, `kind`, `status`, `locale`; sorts `title`, `status`, `updatedAt`. `POST` body `{ kind, title, locale, slug?, bodyMd, seoTitle?, seoDescription? }` (created as a draft). `PATCH` takes `title`, `slug`, `locale`, `bodyMd`, `seoTitle`, `seoDescription`, never `kind` or `status`. `publish` body `{ published: boolean }`, answer the page. `generate` body `{ brands, models, networks }` (string lists), answer `{ created: ContentPage[], skipped: number }`.
- **Help articles** (`/admin/help-articles`): rows carry `answerMd`, `helpfulYes`, `helpfulNo`, `isPublished`, `sort`. Filters `q` (question, topic), `isPublished`; sorts `sort`, `question`, `category`, `isPublished`. `POST` body `{ category, question, answerMd, locale, isPublished? }`; the publish button is `PATCH { isPublished }`.
- **Legal documents** (`/admin/legal-documents`): `type` is `terms`, `privacy`, `refund` or `cookies`; rows carry `bodyMd`, `isCurrent`, `effectiveFrom` (`null` for a version not yet published), `requiresReacceptance` and `acceptedCount` (or `null`). The list answers every version (the console reads up to 200). `POST` body `{ type, locale, version, bodyMd, requiresReacceptance }` makes a version that is not in force; `publish` has no body and answers the published version.
- **TAC catalogue** (`/admin/tac-catalog`): filters `q` (prefix, brand, model, marketing name); sorts `tac`, `brand`, `model`, `releaseYear`. `POST` body `{ tac, brand, model, marketingName?, releaseYear? }`; `PATCH` any of them. `model` is the model code and `marketingName` the name customers know.
- **Languages** are `en` and `ar` (the demo's `EN, AR`); the forms offer those two.
- **Server messages**: a refusal names its field in `errors[]` (`retailPrice`, `serviceId`, `slug`, `version`, `tac`, `title`, `answerMd`…); anything else shows in the dialog's error slot or a toast.

### Questions for the backend

1. Where does the listing's retail price live? Does `PATCH /admin/service-listings/:id` take `retailPrice`, for which languages, and do list rows join `service`, `retailPrice`, `floorPrice`, `marginPct`, `orders30d`, `revenue30d`, `locked` and `lockedReason`?
2. Do the list rows of content pages, help articles and legal documents carry the bodies (`bodyMd`, `answerMd`)? The editors start from the row; if not, they need a call to `GET /:id` first.
3. What are the real values of `content_pages.kind` and `status`? Is there a `noindex` status, and what sets it, since the publish route only publishes or hides? Is the publish body `{ published: boolean }`?
4. Generator: what is the body, does an empty list mean "all", is there a limit on drafts per run, how are titles and slugs made, and which permission does the action need (the slice says `storefront:*` on an action row)?
5. Legal: are the `type` words `terms`, `privacy`, `refund`, `cookies`? Is `requiresReacceptance` applied by the publish? Is there a second-approval rule, and which code does it refuse with? Can the list join `acceptedCount` from `consent_records`?
6. Help articles have no publish route: should the toggle need `storefront:publish` instead of `storefront:update`?
7. TAC: can `tac` be edited after creation? Which `source` values exist? Are `marketingName` and `releaseYear` optional, and what does the server send for an unknown year?
8. Can the API send a page's public address (`path` or `url`), so the table can offer "Open the page" again?
9. When a slug is left empty on create, does the server make it from the title (listings, pages)?

## audit

The map gives the table `audit_logs` and the two routes but no bodies (M10). Marked "Assumed contract" in `api/auditLogs.ts` and `types/index.ts`.

- `GET /admin/audit-logs`: rows are `AuditLog`: `AuditLogRow` with `actorId` and `ip` nullable, plus `actorName` and `entityLabel` (joined by the server; the label is the record's name at the time of the change). `actorType` is `staff` or `system`. `action` is the readable phrase ("changed price of").
- Filters: `actorType`, `actorId`, `entityType`, `from`, `to` (days, both included) and `q` (person, action, record name), with `_start`, `_end`, `_sort=createdAt`, `_order=desc`.
- `entityType` values: the singular names of the demo (`order`, `merchant`, `service`, `supplier`, `payment`, `withdrawal`, `plan`, `session`, `customer`, `staff`, `ip_rule`, `checkout`, `refund`, `dispute`, `ticket`, `listing`, `blocklist`, `legal`, `setting`). Table names (`orders`, `clients`, `staff_users`, `support_tickets`...) are read as the same types when the server sends them, but the filter sends the singular name.
- A list row may leave out `before` and `after` (both `undefined`); the screen then reads `GET /admin/audit-logs/:id` when the entry is opened. A row with `null` for both is a plain action (a sign-in).
- `GET /admin/audit-logs/:id`: the same shape as a list row, with `before` and `after`.

### Questions for the backend

1. Which `entityType` values does the server write, and is there an endpoint (or a fixed list) for the record-type filter? The console uses a fixed list.
2. Does the list join `actorName` and `entityLabel`? If not, can it, so a deleted record or account still reads well?
3. Is `action` a readable phrase or a code (`order.completed`)? If it is a code, which codes exist, so the screen can write them as words?
4. Which filters does `GET /admin/audit-logs` take (`actorType`, `actorId`, `entityType`, `from`, `to`, `q`), and are `from` and `to` whole days, both included, in which time zone?
5. Does the list send `before` and `after`, or only the single read? Are they full rows or only the changed fields, and are secrets (API keys, password hashes) always masked?
6. Is `ip` null for system entries, and should the console show the staff session behind an entry?
7. Offset paging of a growing log shifts rows; would a cursor (`before=<id>`) be better?
8. Will the server offer an audit export (CSV), permission-checked and itself audited?

## system-health

The map describes the 22 rows of the `health` group in words only. Every shape below is in
`src/features/system-health/types/` and marked "Assumed contract" in the JSDoc of `api/`.

- **Measures.** Every number the page judges comes as a `Measure`: `{ value: number | null, unit, state, warn?, crit?,
  direction? }`. `unit` is `ms`, `s` (shown as a duration), `percent` (0 to 100), `per_min`, `count` or `bytes`;
  `state` is `ok`, `warn`, `crit` or `unknown` and is decided by the server; `warn`/`crit` are the thresholds it used
  (printed and drawn, never re-evaluated); `direction` says which side is bad. `value: null` means no data.
- **Series.** `{ at: IsoDateTime, value: number | null }[]`, oldest first; null is a gap.
- **Statuses.** Overall `operational | degraded | outage | unknown` (`unknown` when monitoring data is missing);
  component and store checks `ok | degraded | down | unknown`; circuit breaker `closed | open | half_open`.
- **Ranges.** `GET /admin/system/checks`, `/metrics` and `/errors` take `range=1h|6h|24h|7d` (checks also
  `component=<key>`, metrics and errors also `surface=<id>`); the server picks the bucket size and returns
  `bucketSeconds`. The other reads take no range; their trends cover the last 24 hours (uptime: 30 daily points).
- **Errors.** Reads backed by the monitoring system (`/metrics`, `/errors`) answer 503 `MONITORING_UNAVAILABLE` when
  Prometheus or Sentry does not answer; the console shows "Monitoring unavailable" in neutral, never an error or green.
  Reads that need Postgres answer 503 `DATABASE_UNAVAILABLE` during a database outage.
- `GET /admin/system/health` returns `SystemHealth`: `status`, `since`, `checkedAt`, `monitoring {status, detail,
  lastScrapeAt}`, `build {version, commit, environment, deployedAt}`, `components[]` (key, name, kind
  `core|supplier|gateway`, status, since, latency, uptime 24h/7d/30d, lastCheckedAt, detail, supplierId, gatewayId),
  `uptime {h24, d7, d30, daily}`, `alerts {open, critical, items[], trend}`, `incidents[]` (not resolved),
  `maintenance {enabled, scope, message, expectedEndAt, startedAt, startedBy}`.
- `PUT /admin/system/maintenance` takes `{ enabled: true, scope: store|checkout|api_orders|all, message,
  expectedEndAt | null }` or `{ enabled: false }` and returns the new `MaintenanceState`.
- `GET /admin/system/orders-health`: `stuck {total, heldAmount, byStatus[{status, label, count, oldestAgeSeconds,
  heldAmount}], trend}`, `needsAttention`, `dispatchP95` (seconds), `byServiceType[{type, total, success, failure}]`,
  `heldByRisk {count, amount, oldestAt}`.
- `GET /admin/system/suppliers`: `suppliers[]` with the supplier's switch `status` (`active|disabled|paused`), `health`,
  `since`, `lastSuccessAt`, `latency`, `errorRate`, `timeoutRate`, `circuit`, `lastSyncAt`, `balance {amount,
  currency, state, checkedAt}`. Pausing is the suppliers route (`PATCH /admin/suppliers/:id`, `status: paused`).
- `GET /admin/system/queues`: `queues[]` (name, state, paused, waiting, active, delayed, failed, oldestAge,
  ratePerMin, workers), plus `oldestAge` and `trend` over all queues. `GET …/queues/:name/failed` is a simple-rest
  list of `{id (string), name, failedReason, attemptsMade, maxAttempts, failedAt, subject}`. `POST …/retry` takes
  `{ jobId }` or `{ all: true }` and returns `{ retried }`; `POST …/pause` takes `{ paused, reason? }` (reason
  required to pause) and returns the queue.
- `GET /admin/system/jobs` returns `{ jobs[], runs[] }`; `runs` is the history of one job and is filled only with
  `?job=<name>`. `POST …/jobs/:name/run` and `POST /admin/system/integrity/run` start a run and return the `JobRun`
  (`status: running`).
- `GET /admin/system/integrity`: `{ running, lastRun, lastSuccessAt, checks[] }`; each check has `key`
  (`entries_balanced`, `accounts_match_lines`, `stuck_holds`, `payments_without_entry`), `status pass|fail|unknown`,
  `count`, `difference`, and the first `findings[]` (kind, id, ref, label, difference, ageSeconds, lastEntryAt).
- `GET /admin/system/database` and `/cache`: see `types/stores.ts` (connections, pool wait, locks, replica lag, size
  and growth, pending migrations, slow queries, long transactions; Redis memory, evictions, hit rate, clients,
  latency).
- `GET /admin/system/webhooks`: `{ outgoing, incoming }`, each `{successRate, delivered, failed, retrying,
  oldestUndeliveredAt, oldestAge}` over the last 24 hours.
- Alerts: severities `info | warning | critical`, statuses `firing | acknowledged | resolved`, comparators
  `gt | gte | lt | lte`, channels `telegram | email`. An alert carries its rule (`rule {id, key, name, metric,
  comparator, threshold, windowSeconds, unit}`), `subjectLabel`, `acknowledgedBy {id, name}`, `note`, `incidentId`.
  `GET /admin/alerts` filters `status`, `severity`. `POST /admin/alerts/:id/ack` takes `{ note? }`. Rules: `unit`
  and `open` come from the server; mute is `PATCH { mutedUntil }`, enable is `PATCH { isActive }`.
- Incidents: severities `minor | major | critical`, statuses `investigating | identified | monitoring | resolved`,
  `timeline[{at, status, text, by}]` written by the server. `POST` takes `{title, severity, components, summary,
  alertEventId?}`; `PATCH` takes any of those plus `status` and `update` (one timeline line); closing is
  `{ status: 'resolved', rootCause }`. List filters `status` and `open=true`.

Added after the foundation slice (the mock layer plays all of it; `src/features/system-health/mocks/`):

- **Lists.** Simple-rest (`_start`, `_end`, `_sort`, `_order`, total in `x-total-count`), 25 rows a page. Failed jobs
  newest first (`failedAt`); alerts and incidents newest first (`startedAt`), filters `status`, `severity`,
  `open=true`; `q` searches alerts (rule, subject, note), rules (name, key, metric) and incidents (title, summary).
- **Answers of the writes.** The console reads only `retried` of a retry; an empty 200 or a 204 works for the rest.
  Assumed: pause → the queue's `QueueStats`; run job and integrity run → 202 with the new `JobRun` (`running`,
  `trigger: manual`); maintenance → `MaintenanceState`; ack → `AlertEvent`; rules and incidents → the record (201 on
  create); delete of a rule → 204.
- **Codes.** 404 `NOT_FOUND` (unknown queue, job, alert, rule, incident, component, failed job); 409
  `ALERT_ACKNOWLEDGED`, `ALERT_RESOLVED`, `INCIDENT_CLOSED`, `JOB_ALREADY_RUNNING`; 403 `FORBIDDEN` whose `detail`
  names the missing permission; 422 with `errors[]` on the fields below.
- **422 fields.** Rule: `key` (3-41 `[a-z0-9_]`, unique), `name` (3-80), `metric` (from a fixed list; the server sets
  `unit`), `comparator`, `threshold`, `windowSeconds` (60-86400), `severity`, `channels` (1+), `isActive`, `mutedUntil`
  (future or null). Incident: `title` (3-120), `severity`, `summary` (10+), `components` (1+ known keys), `alertEventId`;
  update: `status`, `update` (≤ 1000), `rootCause` (10+) to close. Maintenance: `scope`, `message` (1-300),
  `expectedEndAt` (future or null). Ack: `note` (≤ 500). Pause: `paused`, `reason` (3+ to pause). Retry: `jobId` or
  `all`. Bad `range` or `surface`: 422 on that field.
- **Health summary details.** `alerts.critical` counts open critical alerts, acknowledged ones included;
  `alerts.items` lists open alerts (the verdict names the critical ones, at most two); `alerts.open.value` null means
  the rules cannot be evaluated. `incidents` holds ongoing incidents only. The KPI row always reads
  `metrics?range=24h`, `queues`, `orders-health` and the summary, whatever the page range.
- **Keys the mock uses** (a guess at the server's): components `api`, `postgres`, `redis`, `storage`, `workers`, `mail`,
  `supplier:<id>`, `gateway:<id>`; surfaces `v1`, `dhru`, `client`, `store`, `admin`, `hooks`; jobs `price_sync`,
  `supplier_balance`, `reminders`, `fx_refresh`, `accruals`, `ledger_integrity`, `data_retention`.
- **Series sizes.** Metrics: 1h = 60 × 1 min, 6h = 72 × 5 min, 24h = 96 × 15 min, 7d = 168 × 1 h. Uptime cells
  (checks): at most 100 per range.

- **Overview tab.** `GET …/checks?component=<key>` answers that component under the same `key` (unknown key: 404);
  the chart draws `CheckBucket.latencyMs` against `ComponentChecks.latency`. `IncidentSummary.components[]` use
  `HealthComponent.key`. `HealthComponent.detail` is set only while a check fails (and for a disabled supplier's note).

- **API tab.** A figure without limits (requests per minute) is `ok` with a value and `unknown` when null. An answer to
  `?surface=<key>` still lists that surface in `surfaces`. `slowest` holds at most ten endpoints, slowest first.
  `ErrorGroup.lastRequestId` may be null; `sentryUrl` is a full address or null (no link then).

- **Orders & suppliers tab.** `stuck.byStatus[].status` uses `pending`, `processing`, `needs_attention`.
  `byServiceType[].total` counts finished orders of the last 24 hours. A supplier's `since` is when its current
  `health` began. `balance.amount` is in `balance.currency`; `balance.state` is the server's low-balance verdict.

- **Queues & jobs tab.** `ScheduledJob.scheduleText` may be empty (the cron text then shows alone; the console never
  reads cron). `JobRun.result` prints as one line of its simple fields. `…/queues/:name/failed` and `…/jobs?job=<name>`
  answer 404 for an unknown queue or job. `POST …/jobs/:name/run` answers 409 `JOB_ALREADY_RUNNING` while a run works.
  `useJobs` reads every 5 s while a job or run is `running`, like the integrity report.

- **Alerts & incidents tab.** "Open" reads `?status=firing` and `?status=acknowledged`. `PATCH /admin/alert-rules/:id`
  takes a partial body (`{ isActive }`, `{ mutedUntil }`, `{ mutedUntil: null }`, or the changed fields).
  `PATCH /admin/incidents/:id` takes `{ status, update }`, closing `{ status: 'resolved', rootCause, update? }`.
  `AlertRule.open` says an alert of the rule is open. An acknowledged alert without `acknowledgedBy` prints "Unknown".

- **Data stores tab.** While Postgres is down, `GET …/database` may answer 200 with `status: down` or 503
  `DATABASE_UNAVAILABLE`; both are handled. `SlowQuery.id` and `LongTransaction.pid` are unique in an answer.
  `size.growthPerDayBytes` null means not measured. `memory.maxBytes` null or 0 means no limit.

- **Integrity tab.** `lastRun` is the last run that ended, or the run going now (`status: running`). A failed or
  skipped run never looked at the ledger. `count` is the full number of findings and `findings` the first ones;
  `ref` of an account finding starts with the account kind and a colon (`client_wallet:4`). `difference: null` means
  the check counts no money.

### Questions for the backend

1. Please confirm the `Measure` shape and that every state and threshold is computed server-side (the console never
   compares a value with a threshold).
2. Are the proposed thresholds of the KPI row right (`docs/system-health-design.md`: uptime 99.9 / 99.5 %, API p95
   800 / 1500 ms, 5xx 0.5 / 2 %, oldest queued job 2 / 10 min, orders past SLA 5 / 20)?
3. Should acknowledging an alert have its own permission? Today `alerts:update` covers both the ack and editing rules.
4. Could the maintenance state also come with `GET /admin/auth/me` (or `GET /health`), so the shell banner reaches staff
   without `system:read` (MISMATCHES M201)?
5. Which surfaces does `/metrics` report (`v1`, `dhru`, `client`, `store`, `admin`, `hooks`?) and with which labels?
6. Do the actions (pause, run job, integrity run, ack, maintenance) answer with the changed record, or 204?
7. Does `POST …/queues/:name/pause` require `reason` to pause (422 on `reason`)?
8. Where does "the action taken" go when an incident closes: `rootCause`, or the closing timeline `update` (M205)?
9. Do `/admin/alerts` and `/admin/incidents` take `status`, `severity`, `open=true` and `_sort=startedAt`; does
   `…/queues/:name/failed` take `_sort=failedAt` and send `x-total-count`?
10. Is `MONITORING_UNAVAILABLE` the code on both `metrics` and `errors`, and does `health` then send `status: unknown`
    with `monitoring.status: unavailable` (M216)?
11. Does every `Measure` with a threshold carry `direction`? Charts colour the wrong side without it.
12. How many buckets does `GET /admin/system/checks` return per range? The uptime strip reads well up to about 100.
13. `GET /admin/system/database` while Postgres is down: 200 with `status: down` (as mocked) or 503? And does
    `health` keep answering then (M212)?
14. Does `?surface=` scope `total` too (M215)? Is an acknowledged critical alert still critical until it resolves (M214)?
15. With Prometheus down, can alert rules still be evaluated (M213)?
16. Does maintenance `message` have a maximum length? Does `expectedEndAt` only inform customers, or does it end
    maintenance by itself? With status `unknown`, what is `since`?
17. Are `version` and `commit` sent as shown (`v1.42.0`, short `9c4e1fa`)? Are `MAINTENANCE` 503 answers counted in
    the 5xx rate?
18. Could `GET /admin/system/checks` offer a lean form (status only) for the uptime bars, and is the number of components capped? The Overview reads every component's buckets only to draw them.
19. Is `HealthComponent.key` stable (`supplier:<id>`, `gateway:<id>`)? It is kept in addresses and in an incident's `components`.
20. Can `SurfaceMetrics` carry its own `state`, so a surface's badge is the server's and not the worst of its figures?
21. Which window do `count429` and the other current figures of `/metrics` cover? Does `slowest` follow `range`? Is an error group's `firstSeenAt` the first time ever or the first time inside the range?
22. Which words does `stuck.byStatus[].status` use, and is `needs_attention` an order status or a queue? The Orders tab of each link depends on it.
23. After a supplier is paused, do its checks and balance sync keep running, or does its `health` become `unknown`?
24. Do supplier latency, error and timeout rates come from Prometheus? With monitoring down they should then be `unknown`; the tab shows whatever state is sent.
25. Is `scheduleText` always sent, and in which time zone does the cron run? When nothing waits, is `oldestAge` `{ value: 0 or null, state: 'ok' }` and `oldestUndeliveredAt` null?
26. Does `POST …/retry` with `all: true` retry only failed jobs, and what does `retried` count? Does the server mark a paused queue itself (`state: warn`, as mocked)?
27. How many runs does `GET …/jobs?job=` return, with paging? Is a `JobRun.result` free of secrets and stable enough to print?
28. Will `GET /admin/alerts` take `open=true` (as incidents do) or several `status` values? Today "Open" is two reads.
29. What does a mute do: no messages while alerts are still recorded, or no evaluation at all? Can the rule carry a `muted` flag so the console need not compare `mutedUntil` with its clock?
30. Which metrics may a rule watch, with which units? An enum or list in the API would replace the console's list.
31. Can one alert start more than one incident, or an incident start from a resolved alert? What happens to the alerts of a deleted rule, and do alerts keep their rule's name and limit after an edit?
32. While Postgres is down, can the lists of `GET …/database` be `null` (not `[]`) when they could not be read, and `locks.waiting` and `waitingClients` null rather than 0? Should these two counts be `Measure`s with limits?
33. When `usage` has no reading, are `used` and `usedBytes` zeros, last known values, or absent? Does Redis send `maxBytes: null` or `0` without a limit?
34. Over which window do a slow query's `calls`, `meanMs` and `totalMs` count, how many statements does `slowQueries` hold, and from which age is a transaction long?
35. Could `GET /admin/system/integrity` carry an overall result (or a count of failed checks), and the start time of a run that is going now?
36. What is the `ref` format of an account finding, and can the ledger be filtered to one account? For entry and payment findings, is `id` the journal entry id and the payment id? How many findings per check does the server send?
