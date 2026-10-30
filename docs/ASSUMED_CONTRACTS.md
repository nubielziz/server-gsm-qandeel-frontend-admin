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
