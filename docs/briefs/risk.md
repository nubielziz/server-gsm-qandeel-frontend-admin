Feature brief: **risk**. Read `/home/saifi/gsm-project/frontend-admin/docs/briefs/_common.md` first (worktree, rules, checks, HANDOFF.md); your worktree is `/home/saifi/gsm-project/worktrees/risk`, your slice `/home/saifi/gsm-project/frontend-admin/docs/slices/risk.json` (11 endpoints).

# Feature: risk ("Risk & checks", `/risk`)
Demo: `/home/saifi/gsm-project/frontend-admin/reference/gsm-admin/src/js/54-p-risk.js` (read it all) and the risk helpers in `12-state-b2c.js` (`heldOrders`, `isHeld`, `scoreStorefrontOrder` signals, blocklist, rules, approve/refund held orders). Entity rows in `src/lib/api/schema.gen.ts`: `RiskAssessmentRow`, `ImeiCheckRow`, `BlocklistEntryRow`, `OrderRow`. Drop `modeGate`.

## Page and permissions
- Page permission `risk:read`; actions check risk:decide, risk:* (blocklist create/delete and rules update per MISMATCHES M7).
- Tabs (URL `tab`, honour `/risk?tab=queue`, ARCHITECTURE §5.2): **Review queue** (default; `GET /admin/risk/queue`: the demo's held-order cards with score meter (`ScoreMeter` from the kit), signals, amount captured, customer, IMEI; actions **Approve and send** (`POST /admin/risk/orders/:id/approve`) and **Refund…** (`POST /:id/refund` with options to add the customer email and/or device to the blocklist, reason), as the demo's "Refund only" / "Refund and block"), **IMEI checks** (`GET /admin/imei-checks` with search and kind/result filter, a row opens the check's details; IMEIs may come back hashed after retention: show what the server sends), **Blocklist** (list with kind filter email / domain / IMEI / card, Add… (`POST`), Remove (`DELETE`, confirm)), **Rules** (`GET`/`PUT /admin/risk/rules`: thresholds and rule toggles as the demo's rules tab; the client only hints that review < block, the server's 422 is shown under the field).
- The scores, signals and decisions come from the server; the client never scores an order.
- Links: the order drawer (`orderPath` from `@/features/orders`, mount `OrderDrawerHost`), the customer (`/customers/<id>`).

## Mocks, tests, bookkeeping
- Mocks inside the feature from the demo seed (held storefront orders from `@/mocks/orders` where they are flagged, `S.imeiChecks`, `S.risk.block`, `S.risk.rules`). Approve/refund change the shared order store through its exported helpers if available, otherwise only the risk queue's own state (log it). Split files ≤ ~200 lines.
- Tests: api, lib, each tab, approve, refund and block, blocklist add/remove with a server error, rules validation error shown, permissions. Helpers in `src/features/risk/test/`.
- `manifest.ts` (page `risk`, heading as the demo's h1, registry). `HANDOFF.md`: mismatch rows RISK-1…, assumed contracts, deep links, backend questions. Coverage 11/11.
