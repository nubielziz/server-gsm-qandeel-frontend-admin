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
