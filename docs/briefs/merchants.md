Feature brief: **merchants**. Read `/home/saifi/gsm-project/frontend-admin/docs/briefs/_common.md` first (worktree, rules, checks, HANDOFF.md); your worktree is `/home/saifi/gsm-project/worktrees/merchants`, your slice `/home/saifi/gsm-project/frontend-admin/docs/slices/merchants.json` (23 endpoints).

# Feature: merchants (`/merchants` and `/merchants/:id`)
Demo: `/home/saifi/gsm-project/frontend-admin/reference/gsm-admin/src/js/42-p-merchants.js` (read it all) and its helpers in `11-state.js` (`merStats`, `walletOf`, `holdOf`, `setMerchantStatus`, `setMerchantGroup`, overrides, `GROUPS`) and `20-ui.js` (`merBadge`). Entity rows in `src/lib/api/schema.gen.ts`: `ClientRow`, `ClientGroupRow`, `ServiceClientPriceRow`, `KycSubmissionRow`, `ApiKeyRow`, `LedgerAccountRow`, `LedgerEntryRow`. Drop `modeGate`.

## Page and permissions
- Page permission (manifest `permission`, any-of): `['clients:read', 'groups:read', 'kyc:read']`. Each tab and action checks its own permission (hint): clients:create/update (M7 maps `clients:*`), wallet:read / wallet:adjust / wallet:credit_limit, api_keys:read / api_keys:revoke, pricing:* (client prices), groups:*, kyc:read / kyc:decide, reports:read.
- List page tabs (URL `tab`): All, Active, Pending approval, Suspended (status filters with counts, like orders' tab counts) plus two new tabs: **Groups** (`groups:read`: client-groups CRUD; columns name, discount, upgrade threshold, deposit limit, merchant count if the DTO has it; create/edit/delete dialogs) and **Verification** (`kyc:read`: KYC submissions list, filter by status, open one in a drawer with its fields and files (`/admin/files/:id` via `orderFileUrl` style helper is the orders feature's; use your own link built with `apiUrl` from `@/lib/api`), Approve / Reject with reason via `POST /admin/kyc-submissions/:id/decide`). Honour `/merchants?tab=pending` (ARCHITECTURE §5.2).
- Toolbar as the demo (search, group filter, Clear filters, count). Approve on pending rows (PATCH status). "Invite merchant" dialog → `POST /admin/clients` (assumed body: name, email, country, groupId, creditLimit?, `invite: true`; the server emails the invitation; EMAIL_TAKEN 409 under the email field).
- Detail `/merchants/:id`: header (name, status badge, group, country) with actions Adjust wallet…, group menu (PATCH `groupId`, toast "New orders use the new prices."), Suspend… / Reactivate (PATCH `status` with `reason`; assumed), credit limit edit (PATCH `/credit-limit` `{ creditLimit }`). Stat grid as the demo. Tabs (URL `tab`): Orders (`OrdersTable` from `@/features/orders` with `fixed={{ clientId }}`, `hideBuyer`, and `OrderDrawerHost`), Wallet ledger (`GET /:id/wallet` balances: available, reserved, credit limit; `GET /:id/statement` rows with running balance; "Download official statement" → `GET /admin/reports/client-statement/:clientId` as a file download, reports:read), Pricing (client prices: list filtered by `clientId`, add / edit / remove override dialogs; show the service name and the group price next to the override), API access (`GET /:id/api-keys`: prefix, created, last used, status; **Revoke** via `DELETE /admin/api-keys/:id` with a danger confirm).
- The demo's **Rotate API key** has no admin route (keys are created by the merchant); port it as Revoke and log the mismatch. Withdrawals stay out (MISMATCHES M3).
- Wallet adjust dialog: amount (positive), direction (credit/debit), reason (required); assumed body `{ amount: Money, direction: 'credit' | 'debit', reason }`; show the server's refusal (e.g. would exceed the credit limit). The server posts the ledger entries; the client never computes balances.

## Exports for other features (from `index.ts`)
`listClients` (the `GET /admin/clients` function) and the `Client` type: the orders feature will replace its private merchant lookup with it. A `MerchantStatusBadge` and `merchantPath(id)` are welcome.

## Palette
A merchants source (search by name/email, opens `/merchants/:id`), registered in `manifest.ts`.

## Mocks (inside the feature)
From the demo seed (`S.merchants`, `S.wallet`, `S.hold`, groups, overrides, keys, KYC if present; synthesize a few KYC submissions and API keys when the seed has none), order stats from `@/mocks/orders`, wallet statement from `@/mocks/ledger` when it fits. Split files ≤ ~200 lines.

## Tests
api (paths, bodies, queries), lib helpers, list page (status tabs + counts, filters in URL, approve, invite with a server error, Groups CRUD, Verification decide), detail page (each tab, wallet adjust with refusal shown, revoke key, override CRUD, permissions disabling actions). Helpers in `src/features/merchants/test/`.

## Bookkeeping
`manifest.ts` (page `merchants`, heading `Merchants`, list + detail loaders, permission any-of above, registry, palette). `HANDOFF.md`: mismatch rows MERCHANTS-1… (at least Rotate → Revoke, new Groups and Verification tabs, assumed bodies), assumed contracts, deep links, backend questions. Coverage 23/23.
