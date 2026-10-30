Feature brief: **refunds**. Read `/home/saifi/gsm-project/frontend-admin/docs/briefs/_common.md` first (worktree, rules, checks, HANDOFF.md); your worktree is `/home/saifi/gsm-project/worktrees/refunds`, your slice `/home/saifi/gsm-project/frontend-admin/docs/slices/refunds.json` (10 endpoints).

# Feature: refunds ("Refunds & disputes", `/refunds`)
Demo: `/home/saifi/gsm-project/frontend-admin/reference/gsm-admin/src/js/53-p-refunds.js` (read it all) and the refund/dispute mutations and helpers in `12-state-b2c.js` (`evidenceFor`, dispute fee, `chargeBadge`, refund statuses). Entity rows in `src/lib/api/schema.gen.ts`: `RefundRow`, `DisputeRow`, `PaymentRow`, `ConsentRecordRow`. Drop `modeGate`.

## Page and permissions
- Page permission (manifest, any-of): `['refunds:read', 'disputes:read', 'reports:finance']`; actions check refunds:approve, disputes:manage.
- Header strip as the demo's `refundStrip` (figures from the server: list totals by status, report totals; no client sums of money beyond formatting).
- Tabs (URL `tab`): **Refunds** (status sub-filter All / Needs approval (`requested`) / Failed / Refunded (`completed`) / Declined (`rejected`) in URL `status`; honour `/refunds?tab=refunds&status=requested|failed`), **Card disputes** (honour `/refunds?tab=disputes`; evidence deadline with the crit colour inside 3 days), **Payments** (storefront payments by method from `GET /admin/reports/payments`, method filter card/crypto, as the demo).
- Refund actions: Approve… (full or partial amount, the demo's dialog: shows the order, what was paid, VAT returned in proportion as the server states it; assumed body `{ amount?: Money }` where omitted = full), Decline… (reason that reaches the customer, required), Retry (failed at the gateway). Show the server's refusal in the dialog.
- Dispute actions: open a dispute (drawer/dialog as the demo) with the evidence pack (payment, delivery, order result, customer consents: from the dispute DTO; assumed fields, logged), **Submit evidence** (`POST /:id/evidence`, assumed body: selected evidence items + note), **Accept the loss** (`POST /:id/accept`, danger confirm stating amount + fee recorded as chargeback loss).
- Links: the order (`orderPath(id)` from `@/features/orders`; mount `OrderDrawerHost` so the drawer opens in place), the customer (`/customers/<id>`).

## Mocks, tests, bookkeeping
- Mocks inside the feature from the demo seed (`S.refunds`, `S.disputes`, `S.payments` for the report). Split files ≤ ~200 lines.
- Tests: api, lib, each tab and sub-filter in URL, approve partial with a server refusal, decline, retry, evidence submit, accept loss, payments report filter, permissions. Helpers in `src/features/refunds/test/`.
- `manifest.ts` (page `refunds`, heading `Refunds & disputes` or the demo's h1, registry, permission any-of). `HANDOFF.md`: mismatch rows REFUNDS-1…, assumed contracts, deep links, backend questions. Coverage 10/10.
