Feature brief: **merchants**. Read `/home/saifi/gsm-project/frontend-admin/docs/briefs/_common.md` first (worktree, rules, checks, HANDOFF.md); your worktree is `/home/saifi/gsm-project/worktrees/merchants`, your slice `/home/saifi/gsm-project/frontend-admin/docs/slices/merchants.json` (23 endpoints).

# Feature: merchants (`/merchants` and `/merchants/:id`)
Demo: `/home/saifi/gsm-project/frontend-admin/reference/gsm-admin/src/js/42-p-merchants.js` (read it all) and its helpers in `11-state.js` (`merStats`, `walletOf`, `holdOf`, `setMerchantStatus`, `setMerchantGroup`, overrides, `GROUPS`) and `20-ui.js` (`merBadge`). Entity rows in `src/lib/api/schema.gen.ts`: `ClientRow`, `ClientGroupRow`, `ServiceClientPriceRow`, `ApiKeyRow`, `LedgerAccountRow`, `LedgerEntryRow`. Drop `modeGate`.

## Page and permissions
- Page permission (manifest `permission`, any-of): `['clients:read', 'groups:read']`. Each tab and action checks its own permission (hint): clients:create/update (M7 maps `clients:*`), wallet:read / wallet:adjust / wallet:credit_limit, api_keys:read / api_keys:revoke, pricing:* (client prices), groups:*, reports:read.
- List page tabs (URL `tab`): All, Active, Suspended (status filters with counts, like orders' tab counts) plus one new tab: **Groups** (`groups:read`: client-groups CRUD; columns name, discount, deposit limit, merchant count if the DTO has it; create/edit/delete dialogs). The map's verification tab was retired (MISMATCHES M278), and so was the Pending approval tab: an old `?tab=pending` opens the first tab (ARCHITECTURE §5.2).
- Toolbar as the demo (search, group filter, Clear filters, count). "Invite merchant" dialog → `POST /admin/clients` (assumed body: name, email, country, groupId, creditLimit?, `invite: true`; the account is active at once and the server emails the link to choose a password; EMAIL_TAKEN 409 under the email field).
- Detail `/merchants/:id`: header (name, status badge, group, country) with actions Adjust wallet…, group menu (PATCH `groupId`, toast "New orders use the new prices."), Suspend… / Reactivate (PATCH `status` with `reason`; assumed), credit limit edit (PATCH `/credit-limit` `{ creditLimit }`). Stat grid as the demo. Tabs (URL `tab`): Orders (`OrdersTable` from `@/features/orders` with `fixed={{ clientId }}`, `hideBuyer`, and `OrderDrawerHost`), Wallet ledger (`GET /:id/wallet` balances: available, reserved, credit limit; `GET /:id/statement` rows with running balance; "Download official statement" → `GET /admin/reports/client-statement/:clientId` as a file download, reports:read), Pricing (client prices: list filtered by `clientId`, add / edit / remove override dialogs; show the service name and the group price next to the override), API access (`GET /:id/api-keys`: prefix, created, last used, status; **Revoke** via `DELETE /admin/api-keys/:id` with a danger confirm).
- The demo's **Rotate API key** has no admin route (keys are created by the merchant); port it as Revoke and log the mismatch. Withdrawals stay out (MISMATCHES M3).
- Wallet adjust dialog: amount (positive), direction (credit/debit), reason (required); assumed body `{ amount: Money, direction: 'credit' | 'debit', reason }`; show the server's refusal (e.g. would exceed the credit limit). The server posts the ledger entries; the client never computes balances.

## Exports for other features (from `index.ts`)
`listClients` (the `GET /admin/clients` function) and the `Client` type: the orders feature will replace its private merchant lookup with it. A `MerchantStatusBadge` and `merchantPath(id)` are welcome.

## Palette
A merchants source (search by name/email, opens `/merchants/:id`), registered in `manifest.ts`.

## Mocks (inside the feature)
From the demo seed (`S.merchants`, `S.wallet`, `S.hold`, groups, overrides, keys; synthesize a few API keys when the seed has none), order stats from `@/mocks/orders`, wallet statement from `@/mocks/ledger` when it fits. Split files ≤ ~200 lines.

## Tests
api (paths, bodies, queries), lib helpers, list page (status tabs + counts, filters in URL, invite with a server error, Groups CRUD), detail page (each tab, wallet adjust with refusal shown, revoke key, override CRUD, permissions disabling actions). Helpers in `src/features/merchants/test/`.

## Bookkeeping
`manifest.ts` (page `merchants`, heading `Merchants`, list + detail loaders, permission any-of above, registry, palette). `HANDOFF.md`: mismatch rows MERCHANTS-1… (at least Rotate → Revoke, the new Groups tab, assumed bodies), assumed contracts, deep links, backend questions. Coverage 23/23.
