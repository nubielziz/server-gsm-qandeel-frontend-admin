# Customers: handoff for feature 21 (Customer wallet, console slice C1)

The Wallet tab on `/customers/:id?tab=wallet`, plus the small edits in Finance, Merchants, Refunds, Risk and Settings that the plan
(`backend-21/docs/briefs/21-customer-wallet.md` section 10, C1) names. Wire shapes come from the backend's
`src/modules/money/contracts/customer-wallet.contracts.ts` (routes beyond the map, plan section 7.2).

## Mismatches

| #            | Area                      | Demo / console before                                              | Backend contract                                                                                   | Followed | Why                                                                                                                                                             |
| ------------ | ------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CUSTWALLET-1 | Customer page has no wallet | Tabs: Orders, Account, Support, Consents and data, Risk.           | `GET /admin/customers/:id/wallet*` (`wallet:read`), writes need `wallet:adjust`.                   | Backend  | New Wallet tab after Account, shown only with `wallet:read`; buttons need `wallet:adjust`. An address that names the tab without the permission shows Orders.   |
| CUSTWALLET-2 | Wallet adjust header      | The merchant adjust sent no `Idempotency-Key` (D5).                | Required on every customer wallet write; optional on the merchant route (L1).                      | Backend  | Merchant and customer dialogs make one key per opening (`crypto.randomUUID()`), sent with every retry of that opening.                                          |
| CUSTWALLET-3 | Refund / report method    | `card`, `wallet`, `crypto`.                                        | `balance` on refunds, the payments report and the risk queue.                                      | Backend  | Label "Store balance"; filter option; the approve dialog says the money returns to the store balance at once; the risk sentence says "store balance".           |
| CUSTWALLET-4 | Deposits owner            | Deposits were merchants' only; "Paid by" was a merchant.           | `customer` and `dispute` on payments; filters `owner`, `customerId`.                               | Backend  | "Paid by" shows the customer with a link to `/customers/<id>?tab=wallet` and a masked email; a chargeback chip; a payer select (All, Merchants, Customers).    |
| CUSTWALLET-5 | Settings                  | System tab: one typed number (IMEI retention).                     | Eight `wallet.customer.*` keys, two booleans, six whole numbers.                                   | Backend  | New "Customer wallet" panel; each setting saves on its own; ranges are hints, the server decides. Unset keys show the server's default in the empty box.        |

## Assumed contracts

- `GET /admin/customers/:id/wallet/statement` rows are `{ id, transactionId, kind, memo, amount, balanceAfter, createdAt }` (the merchant statement's row); the admin row has no `orderId`.
- `x-total-count` carries the statement total; `createdAt_gte` and `createdAt_lte` are ISO times (the range is sent as UTC day start and `T23:59:59.999Z`).
- A key missing from `GET /admin/settings` means "server default"; the two switches read as off.
- `GET /admin/customer-wallets` filters `state` (`positive|zero|negative|frozen`), `q`; sorts `balance`, `updatedAt`.

## SHARED-NEEDS

- Shared files edited (lead decision L4): `src/mocks/settings.ts` (the master switch on in the dev mock settings). No change to `src/app`, `src/lib`, `src/components/ui`.
- The backend's shape-parity allowlist entries for `balance` (id `CUSTOMER_WALLET_MISMATCH`) go stale once this merges.
