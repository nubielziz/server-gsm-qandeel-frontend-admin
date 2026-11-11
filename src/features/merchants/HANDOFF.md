# Merchants: handoff of feature 20 (merchant management), console part (K1-K5)

For the lead. The lead moves the rows into `docs/MISMATCHES.md` (numbers in merge order) and deletes this file in the squash commit.

## Mismatch rows

| Id | Where | Frontend / map | Backend | Chosen | Why |
|---|---|---|---|---|---|
| MERCHANTS-1 | Merchant page: suspended banner | Demo: "API calls return an error and the portal is read-only. Existing open orders continue." | Plan K1 and decision O-4: sign-in and API calls are refused, open orders continue | The plan's text: "Sign-in and API calls are refused. Open orders continue." plus "Reason: <reason> · by <staff> · <ago>" from `client.suspension` | The portal is not read-only any more (login is refused) |
| MERCHANTS-2 | Merchant page: tabs | Demo: four tabs | Plan K1: nine tabs, Orders first | Orders, Wallet ledger, Billing, Pricing, API access, Profile, Security, Verification, Audit; Billing is any-of `invoices:read`, `payments:read` | No deep link changes: `?tab=` of the first four is unchanged |
| MERCHANTS-3 | Merchant page: pending application | Demo: Approve only | Decision O-4: a pending applicant can be suspended, which is how an application is declined | "Decline…" beside "Approve account" (`clients:update`), the same `PATCH { status: 'suspended', reason }`; its toast reads "<name>’s application declined" | No new route; a declined merchant can be reactivated |
| MERCHANTS-4 | Security tab: ending one session | Staff Sessions tab asks for a review step | Plan K2: "End" per row | One click, no review step, a toast; the 403/404 shows in a toast | A merchant session is low risk (they sign in again); the list is short |
| MERCHANTS-5 | Billing tab in dev mocks | – | `GET /admin/invoices` and `/admin/payments` filter by `clientId` | The finance feature's mock handlers ignore `clientId`, so under `VITE_API_MOCKS=true` the Billing tab lists nothing; the tests answer both routes themselves | See SHARED-NEEDS |
| MERCHANTS-6 | Create key: scopes | Merchant portal creates keys with its own scope list | Backend `MERCHANT_KEY_SCOPES`: `dhru`, `account:read`, `orders:read`, `orders:write`, `services:read` (and `<area>:*`) | The dialog offers exactly the five, none ticked at first ("Choose at least one scope."); wildcards are not offered | Least privilege; the server still accepts wildcards |

## Contracts used (taken from the backend's `*.contracts.ts` of `feat/backend-20`, not assumed)

`POST /admin/clients/:id/password`, `/reset-2fa`, `/sessions/revoke`, `/verify-email/resend` (`client-security.contracts.ts`);
`POST /admin/clients/:id/api-keys`, `PATCH /admin/api-keys/:id` (`api-keys.contracts.ts`); `PATCH /admin/clients/:id` with the nine
details and the `ClientRow` keys `locale`, `address`, `taxId`, `internalNotes`, `telegramLinked`, `security`, `suspension`
(`clients.contracts.ts`); `GET /admin/sessions?subjectType=client&subjectId=<id>` (`sessions.contracts.ts`); `GET /admin/audit-logs`
with `entityType` and `entityId` (platform `audit-logs.contracts.ts`, already built).

Open backend questions: none blocking. `ClientRow` keys of feature 20 are optional in the schema: the console treats a missing one as
"not known" and shows a dash (Security tab: a note that the server sent no sign-in details).

## Deep links

`/merchants/<id>?tab=billing|profile|security|verification|audit` (and `?tab=verification&kyc=<id>` for the side sheet);
`/audit?type=merchant&record=<id>` (the audit log filtered to one record; `record` counts only beside `type`).

## SHARED-NEEDS

- `src/features/finance/mocks/invoiceHandlers.ts` and `paymentHandlers.ts`: honour a `clientId` filter (rows hold `client.id`), so the
  Billing tab shows data under `VITE_API_MOCKS=true` (MERCHANTS-5). The two handlers can read `params.get('clientId')` and filter on
  `client?.id` before `applyListQuery`. Not done here: the files are outside the shared files the plan lets this feature edit.
- Done in shared files, as the plan allows: `src/mocks/roles.ts` (`clients: read create update security`, `api_keys: read create update
  revoke`), `src/mocks/handlers/accessSessions.ts` (`subjectId` with `subjectType`, 422 otherwise).
- Done in a shared file the plan does not name: `src/features/access/index.ts` also exports `./lib/userAgent`
  (`describeUserAgent`, for the device column of the merchant's sessions). One line.
