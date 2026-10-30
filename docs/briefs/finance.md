Feature brief: **finance**. Read `/home/saifi/gsm-project/frontend-admin/docs/briefs/_common.md` first (worktree, rules, checks, HANDOFF.md); your worktree is `/home/saifi/gsm-project/worktrees/finance`, your slice `/home/saifi/gsm-project/frontend-admin/docs/slices/finance.json` (14 endpoints).

# Feature: finance (`/finance`)
Demo: `/home/saifi/gsm-project/frontend-admin/reference/gsm-admin/src/js/45-p-finance.js` (read it all) and its helpers in `11-state.js` (journals/`postTo`, accounts, `pendingPayments`, payment approve/reject) and `10-ledger*.js` if present. Entity rows in `src/lib/api/schema.gen.ts`: `LedgerAccountRow`, `LedgerTransactionRow`, `LedgerEntryRow`, `InvoiceRow`, `PaymentRow`, `CurrencyRow`. Drop `modeGate`.

## What already exists (keep it working)
`src/features/finance` was started by the orders feature: `api/ledger.ts` (`listLedgerTransactions`, `getLedgerTransaction`, `@route` tags for both), `api/resources.ts` (`ledger/transactions` resource), `lib/kinds.ts` (`ledgerKindLabel`, `journalLabel`), `types/` (`LedgerTransaction`, `LedgerEntry`, account refs) and `manifest.ts` (registry only). Orders and the shared mock `src/mocks/ledger.ts` import these: keep their names and shapes (extend, do not rename). The ledger mock store lives in `src/mocks/ledger.ts` (shared, read-only for you): put new finance mocks (accounts, payments, invoices, reports) in `src/features/finance/mocks/` and read the shared ledger store from `@/mocks/ledger` where it helps.

## Page and permissions
- Page permission (manifest, any-of): `['ledger:read', 'payments:read', 'invoices:read', 'reports:read', 'reports:finance']`; every tab and action checks its own (`invoices:*` → read/create per MISMATCHES M7; payments:approve; ledger:reconcile).
- Header: the demo's `finStrip` figures from server data (wallet exposure report for balances/overdraft/reserved; pending deposits count from the payments list total). Actions: Export (the demo's CSV of the ledger: use the server list of the current filters page by page up to a cap, or drop it if that would be a bulk personal-data export; decide, and log), Run reconciliation (`POST /admin/ledger/reconcile`, ledger:reconcile, shows the server's result: differences found or none).
- Tabs (URL `tab`): **Ledger** (default; journals list with search and kind filter, a journal opens a drawer with its lines; reuse the orders feature's way of showing lines if it fits, through `@/features/orders` only if exported, otherwise your own component), **Deposits** (payments review: sub-tabs Pending / Approved / Rejected / All with counts; a payment opens the demo's dialog with Approve (top-up) and Reject with reason; honour `/finance?tab=payments`), **Trial balance** (`GET /admin/ledger/accounts`, the demo's accounts tab), new **Invoices** (list, open one, "Issue manual invoice" for a merchant via `POST /admin/invoices`; merchant picker: private read-only lookup on `GET /admin/clients` without `@route`, like orders' lookups), new **Reports** (profit by day / service / supplier / merchant with a `StackedBarChart` or table, wallet exposure, VAT by country and period (reports:finance); each report reads its own route, nothing is summed in the browser).
- **Withdrawals** tab stays out (MISMATCHES M3).
- Money: 4-decimal strings, formatted only. Debit/credit columns as the demo; the ledger lines' sign convention is the one already in `types/` (positive = debit).

## Exports, palette, mocks, tests
- Keep existing exports; add what other pages may need (`PaymentStatusBadge`, `financePath(tab)`).
- Palette: journals by reference (optional; skip if the list route has no search).
- Mocks inside the feature from the demo seed (`S.payments`, `S.journals`/accounts, invoices synthesized if absent, report figures computed in the mock from the stores). Split files ≤ ~200 lines.
- Tests: api, lib, each tab, approve/reject with a server error shown, reconcile result, invoice issue, reports render, permissions; keep the orders tests green. Helpers in `src/features/finance/test/`.

## Bookkeeping
`manifest.ts`: add the page (`finance`, heading `Finance`, list loader, permission any-of) to the existing manifest. `HANDOFF.md`: mismatch rows FINANCE-1… (new Invoices and Reports tabs, export decision, assumed bodies), deep links, backend questions. Coverage 14/14.
