# Merchants: handoff of feature 20 (merchant management), console part (K1-K5)

For the lead. The lead moves the rows into `docs/MISMATCHES.md` (numbers in merge order) and deletes this file in the squash commit.

> **2026-11-16, English only (decision 039):** a merchant has no language any more: no `locale` on the row or in the details body, no Language select in Edit details, no Language row on the Profile tab. The rows below are the handoff as written.

## Mismatch rows

| Id | Where | Frontend / map | Backend | Chosen | Why |
|---|---|---|---|---|---|
| MERCHANTS-1 | Merchant page: suspended banner | Demo: "API calls return an error and the portal is read-only. Existing open orders continue." | Plan K1 and decision O-4: sign-in and API calls are refused, open orders continue | The plan's text: "Sign-in and API calls are refused. Open orders continue." plus "Reason: <reason> · by <staff> · <ago>" from `client.suspension` | The portal is not read-only any more (login is refused) |
| MERCHANTS-2 | Merchant page: tabs | Demo: four tabs | Plan K1: nine tabs, Orders first (the Verification tab was retired later, MISMATCHES M278) | Orders, Wallet ledger, Billing, Pricing, API access, Profile, Security, Audit; Billing is any-of `invoices:read`, `payments:read` | No deep link changes: `?tab=` of the first four is unchanged |
| MERCHANTS-3 | Merchant page: an account that is still `pending` | Demo: Approve only | Staff-made accounts are active at once; `pending` stays a dormant status for accounts made before that change | One action, "Activate account" (`clients:update`), the same `PATCH { status: 'active' }` Approve sent; the banner says "Not active yet"; no Pending tab, no count on the list header or the sidebar, no dashboard row | A legacy account must still be reachable; the status value goes later with the accounts merge |
| MERCHANTS-5 | Billing tab in dev mocks | – | `GET /admin/invoices` and `/admin/payments` filter by `clientId` | The finance feature's mock handlers ignore `clientId`, so under `VITE_API_MOCKS=true` the Billing tab lists nothing; the tests answer both routes themselves | See SHARED-NEEDS |
| MERCHANTS-6 | Create key: scopes | Merchant portal creates keys with its own scope list | Backend `MERCHANT_KEY_SCOPES`: `dhru`, `account:read`, `orders:read`, `orders:write`, `services:read` (and `<area>:*`) | Retired with the REST API for merchants: the dialog offers no scope. A new key goes out with `scopes: ['dhru']` (a backend that still asks for a list accepts it; one that dropped the list ignores it), and the scopes a backend still sends on a key are neither read nor shown | A key is a Dhru credential with allowed addresses and an expiry |

## Contracts used (taken from the backend's `*.contracts.ts` of `feat/backend-20`, not assumed)

`POST /admin/clients/:id/password`, `/reset-2fa`, `/sessions/revoke`, `/verify-email/resend` (`client-security.contracts.ts`);
`POST /admin/clients/:id/api-keys`, `PATCH /admin/api-keys/:id` (`api-keys.contracts.ts`); `PATCH /admin/clients/:id` with the nine
details and the `ClientRow` keys `address`, `taxId`, `internalNotes`, `security`, `suspension`
(`clients.contracts.ts`); `GET /admin/audit-logs`
with `entityType` and `entityId` (platform `audit-logs.contracts.ts`, already built).

Open backend questions: none blocking. `ClientRow` keys of feature 20 are optional in the schema: the console treats a missing one as
"not known" and shows a dash (Security tab: a note that the server sent no sign-in details).

## Deep links

`/merchants/<id>?tab=billing|profile|security|audit` (an old `?tab=verification` opens the first tab);
`/audit?type=merchant&record=<id>` (the audit log filtered to one record; `record` counts only beside `type`).

## SHARED-NEEDS

- `src/features/finance/mocks/invoiceHandlers.ts` and `paymentHandlers.ts`: honour a `clientId` filter (rows hold `client.id`), so the
  Billing tab shows data under `VITE_API_MOCKS=true` (MERCHANTS-5). The two handlers can read `params.get('clientId')` and filter on
  `client?.id` before `applyListQuery`. Not done here: the files are outside the shared files the plan lets this feature edit.
- Done in shared files, as the plan allows: `src/mocks/roles.ts` (`clients: read create update security`, `api_keys: read create update
  revoke`).
