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
