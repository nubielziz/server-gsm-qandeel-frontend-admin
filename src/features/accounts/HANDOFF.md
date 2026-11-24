# Accounts: handoff of the one Accounts page and of the removal of Merchants and Customers

The Accounts page (`/accounts` and `/accounts/:id`) replaces the Merchants and Customers pages. This file is for the maintainers and for the document
writer: the rows of the mismatch log, the views, the parts and the addresses of the page, what the old pages did that this page does differently,
the deep links, and the ledger that says where every test case of the two deleted features went. The decision text is console decision 023.

## What the removal did

- Deleted `src/features/merchants/**` (134 files) and `src/features/customers/**` (111 files), their 39 test files (497 cases) and their two older
  handoff files. Nothing outside the two folders imported them any more: the only lines that still contain the words `features/merchants` or
  `features/customers` are the filter of retired mock paths `src/mocks/featureMocks.ts` with its test, and one history line of
  `src/features/notifications/HANDOFF.md`. None is an import; they stay.
- `manifest.ts` of this feature now has `registry: accountsResources`. The four Refine resource names `clients`, `client-groups`, `client-prices`
  and `data-requests` come from the accounts feature only (the data layer refuses a name two features register). The `customers` resource is gone.
  `src/app/features.test.ts` and `src/app/palette/palette.test.tsx` are green because the old manifests are gone.
- Checks made before the deletion: no import of the two folders outside them; no stand-in text ("being built") left in this feature; every test
  file the ledger below names exists (76 files).
- Checks made after it: `npm run typecheck` has no error in the whole console; `npm run lint` (eslint, prettier, English check) is clean on the whole
  console; the 100 test files of this feature and the two shell tests above pass (102 files, 1162 tests); the files that merge the resource registries and
  the legacy redirects pass too (`src/app/resources.test.ts`, `routes.test.tsx`, `legacyRedirects.test.ts`, `legacyRoutes.test.tsx`,
  `src/lib/api/registry.test.ts`, `src/mocks/featureMocks.test.ts`).

## Views, parts and addresses

One page, two addresses. The list page is `/accounts?view=...`; the record is `/accounts/:id?tab=<part>`. `tab` names the part on the right of the
record's left menu; the record has no tab strip. `lib/paths.ts` holds the only address builders: `accountsListPath(state)`, `ranksPath()`,
`accountPath(id, tab?, { order? })` and `legacyAccountPath(type, oldId, tab?)`.

Frame: heading "Accounts"; level 1 a strip of tabs, **All accounts | Retail | Merchants | Guests** (with counts from `GET /admin/clients/counts`), plus, on
a record, a last raised tab named after the account; level 2 text links **All | Add Account (+) | Ranks | Add Rank (+)**, a divider, **Data requests (n)**.
The strip scopes the All view only; on Ranks, Add Rank, Edit rank, Data requests and Add Account no tab is raised. Every link is a full view: no side
panel of its own, no multi-step dialog.

### Views

| View (`view=`) | Link | Who may use it | Folder under `components/` |
| --- | --- | --- | --- |
| `all` (absent) | All | `clients:read` | `list/` |
| `add` | Add Account (+) | `clients:read` and `clients:create` | `create/` |
| `ranks` | Ranks | `groups:read` | `ranks/` |
| `add-rank` | Add Rank (+) | `groups:read` and `groups:create` | `ranks/` |
| `requests` | Data requests | `clients:read` and `customers:privacy` | `requests/` |
| `edit-rank` | (no link; Edit opens it) | `groups:read` | `ranks/` |

The page opens for `clients:read` or `groups:read`. An unknown view, or one the role may not use, is replaced by the first view the role may use; a
role with `groups:read` alone lands on Ranks; a role with neither sees "Nothing here for your role".

### The 13 parts of a record (left menu order)

| `tab` id | Label | Shown for |
| --- | --- | --- |
| `overview` | Overview | `clients:read` |
| `wallet` | Financial | `wallet:read`, an account with a login, not anonymized |
| `profile` | Profile (new id) | `clients:read`, not anonymized |
| `invoices` | Invoices (new id) | `invoices:read`, an account with a login |
| `payments` | Payments (new id) | `payments:read` |
| `api` | API (new id) | `api_keys:read`, a merchant rank, a login, not anonymized |
| `security` | Security | `clients:read`, a login, not anonymized |
| `prices` | Prices | `pricing:read`, a merchant rank, a login, not anonymized |
| `orders` | Orders (count = `ordersCount`, shown at 0 too) | `orders:read` |
| `support` | Support | `support:read` |
| `statement` | Statement (new id) | `wallet:read`, an account with a login |
| `privacy` | Privacy and risk | `clients:read` |
| `audit` | Activity Log | `audit:read` |

A merchant rank shows up to 13 parts, a retail account with a login 11 and a guest 7. The eight ids the data layer had before keep their meaning for
every other feature (`accountPath(id, 'wallet')` still opens Financial). The five added part ids are **`profile`, `invoices`, `payments`, `api` and
`statement`**. An unknown, hidden or retired part (`tab=verification`, `tab=risk`) shows the first visible part and the address is not rewritten.
Only Profile is a form with a pinned Save; every other part is read-only and acts through its own dialogs.

### Deep links

| Key | Values | Belongs to |
| --- | --- | --- |
| `view` | absent = `all`; `ranks`, `add`, `add-rank`, `edit-rank`, `requests` | every view |
| `chip` | absent = all accounts; `retail`, `merchants`, `guests` | All |
| `status` | `active`, `suspended`, `blocked`, `anonymized` | All |
| `rank` | a rank id | All |
| `country` | two letters | All |
| `q` | search text (name, email, company, username) | All |
| `sort`, `dir` | All: `name` (default), `rank`, `status`, `balance` (needs `wallet:read`), `ordersCount`, `lastOrderAt`; Data requests: `dueAt` (default), `requestedAt`, `status`; `dir=desc` only when descending | All, Data requests |
| `page`, `size` | page 1 or more (1 left out); size 25, 50, 100 or 200 (50 left out) | All, Ranks, Data requests |
| `id` | the rank being edited | Edit rank |
| `request` | absent = open and in progress; `open`, `in_progress`, `completed`, `rejected`, `any` | Data requests |

Keys are written in this order by `accountsListPath`; only the keys a view uses are written, and defaults are left out. On a record: `tab=<part>`
(`overview` left out), `order=<id>` (the order drawer of the Orders part; an address with `order` and no `tab` opens Orders), and
`from=customer|merchant|client` (the resolver below). Lists inside parts (statement, invoices, payments, activity, keys, fixed prices) keep their page, size,
sort and date range in the part, not in the address.

Old addresses the page honours (the shell redirects `/merchants` and `/customers` first, see `src/app/legacyRedirects.ts`): `chip=suspended` and
`chip=blocked` become `status=`; `chip=requests` opens Data requests (All when the role may not use it); `view=ranks`; an old Flagged, Verification
or Pending approval address opens All and keeps the search; `sort=riskLevel` opens the default sort; an unknown chip, status, sort, size or rank is dropped
and the entry replaced; a page past the end moves to the last page. `/accounts/<n>?from=customer|merchant|client[&tab=<part>]` shows only a loader, asks
`GET /admin/legacy-accounts/<type>/<n>` and replaces the entry with the account's address; it never reads or draws account `<n>` on the way (a customer
number is not an account number). The strip remembers the last list address of each tab in `sessionStorage` (`gsm-accounts-list-address`); the record's
"Back to All" uses it.

## What the old pages did that this page does differently

- **Activate account.** The old merchant page had a header button "Activate account" and a "Not active yet" note for a merchant whose status was
  `pending`. There is no `pending` status now (the four statuses are active, suspended, blocked, anonymized). A former pending account is read as
  suspended with the migration's fixed reason and comes back through "Reactivate…"; a retired word from an older server is shown as written, with no banner
  and no button.
- **The Flagged tab.** The old customers list had a Flagged tab (customers by risk level), retired before this change but still accepted in an address.
  The strip has four populations only, and an old Flagged, Verification or Pending approval address opens All.
- **The risk level.** No list column, no header badge and no row shows a risk level, whatever an older server still sends; `sort=riskLevel` opens the default
  sort. Privacy and risk shows the highest score and the signals seen on orders (eight lines at most, then "and N more").
- **The per-device session list.** Security shows "Active sessions" as a count (or "No active sessions"), never a list of devices; "Sign out everywhere" asks
  first and says how many devices will be signed out. Sessions of either kind are listed in the access feature.
- **Show more.** The old merchant Audit tab read 25 entries and a "Show more" button. Every list of the page ends in the pinned footer pager (All, Ranks, Data
  requests, Statement, Invoices, Payments, API keys, fixed prices, Activity Log): 25 entries to start in Activity Log, 50 elsewhere, sizes 25, 50, 100, 200; a
  size change goes back to page 1; a list that shrinks goes to its last page. The Orders part ends with the orders table's own pager.
- **The header actions.** The old merchant header held Adjust wallet…, Credit limit…, the group menu and Activate account, Suspend… or Reactivate; the old
  customer header held Edit details, Suspend… or Reactivate and Block… or Unblock. The record has no action header: the page heading is "Accounts" and the
  account's name is the title of the left menu. Each action sits in the part that owns it: Overview (Change rank…, Suspend…, Reactivate…, Make an account…),
  Financial (Adjust wallet…, Put on hold… or Lift hold…, Credit limit…, the official statement), Profile (the pinned Save), Security (Password…, Sign out
  everywhere, Reset two-step sign-in…, Resend verification email, Block IP… for the shop audience), Privacy and risk (Export data…, Anonymize…, Block… or Unblock…), API (New key…,
  Limits…, Revoke…), Prices (Add fixed price…); the list's row menu offers the common ones.
- **Smaller changes of the same kind.** The group menu in the header is "Change rank…", a dialog that names the blockers and the amount that moves, and it is
  offered to the Owner role only; a merchant rank in Add Account, and "New key…", are Owner only too. Edit details dialogs became the Profile form. The
  Groups tab became the Ranks view (Add Rank and Edit rank are views; Delete lives in the With selected strip only). Billing became Invoices and
  Payments; Wallet ledger became Financial and Statement; the customers' Account tab became Security; Consents and data and Risk became Privacy and risk;
  the Data requests tab became a view of its own; Pricing became Prices ("Fixed prices", "Add fixed price…"); API access became API; Audit became Activity
  Log. The scope list of an API key is gone (a new key sends `scopes: ['dhru']` only). Block has no note: it sends one of four reasons. An anonymized
  account offers no action, Export included. No bulk action moves money: With selected offers Suspend…, Reactivate… and Sign out everywhere only.
  Wallet adjustments, holds, credit limits and rank changes are single-account dialogs, each with one key per opening.

## Rows for the mismatch log

The rows below are the page's own (frontend, map, what was chosen). They move into `docs/MISMATCHES.md` in merge order; the next free console
row is M361. The data layer's rows, which carry the shape of the list, the counts, the rank change, the wallet and the retired customer routes, are not
repeated here.

| Row | Where | Frontend | Map | Chosen | Why |
| --- | --- | --- | --- | --- | --- |
| ACCOUNTS-1 | Merchants and Customers pages | One page, `/accounts`, with a record of 13 parts; the old addresses redirect. | Two groups of routes, `clients` and `customers`, and two pages in the demo. | The frontend (console decision 023). | One account type, told apart by its rank. |
| ACCOUNTS-2 | `GET /admin/clients` sort and filters | `_sort` is one of `name`, `rank`, `status`, `balance`, `ordersCount`, `lastOrderAt` (`balance` only with `wallet:read`); filters `rankId`, `rankKind`, `hasAccount`, `country`, `status` and `q` over name, email, company and username. | A list with a search and a status and group filter. | The frontend; the server answers them. | The page's table, strip and Quick Search box. The default sort is account A to Z; there is no server sort by 30-day spend. |
| ACCOUNTS-3 | `PATCH /admin/clients/:id` (suspend) | `{ status: 'suspended', reason }`, the reason chosen from a menu with an optional note, sent as the reason alone or `<reason>: <note>`, cut to 140 characters. | A status change with no body. | The frontend; the server takes 3 to 140 characters. | The old customer and merchant dialogs sent a reason the same way. |
| ACCOUNTS-4 | Count of "Data requests (n)" | One `GET /admin/data-requests` for the open and in progress statuses, one row, the total read from `x-total-count`; read only with `customers:privacy`. | The list route and its total header. | The frontend. | No route counts requests. |
| ACCOUNTS-5 | `GET /admin/clients/:id` figures | Overview shows the 30-day figures and the order count; it shows no lifetime spend, refunds, tickets or disputes. | – | The frontend. | The detail read carries only the 30-day figures and `ordersCount`; the old customer page showed lifetime figures. A lifetime block can be added to the read later; the part already leaves the rows out when they are absent. |
| ACCOUNTS-6 | Bulk actions | With selected offers Suspend…, Reactivate… and Sign out everywhere; each runs one request per account and ends in a summary when the server refused some. | – | Console decision. | No bulk action moves money, limits spending, mails people, blocks or anonymizes. |
| ACCOUNTS-7 | Anonymized account | No action is offered, Export included; Privacy and risk says what was removed. | `GET /admin/clients/:id/export` answers any account. | Console decision. | Every write on an anonymized account is refused; an export of removed data has nothing to hold. |

## Port ledger

The two deleted features had 39 test files and 497 cases. Every case has a home below (the file names are relative to `src/features/accounts/`); an
"adapted" case keeps its intent in this page's words. The data layer's own suites took the API, hook, mock and palette files. The counts come from the old files
at the commit before the deletion; the old case list is also in `git show HEAD:<path>` of the commit this change starts from.

| Old file (cases) | Old cases | New test file | What went there |
| --- | --- | --- | --- |
| `customers/api/customers.test.ts` (29) | 1-3 | `api/accounts.test.ts`, `api/security.test.ts`, `api/privacy.test.ts` | what each function sends: list, show, create, edit, each account action on its own route |
|  | 4 | `api/privacy.test.ts` | export file named by the server, or account-<id>.json |
|  | 5 | `api/dataRequests.test.ts` | read and move data requests |
|  | 6 | `api/retired.test.ts` | Refine resources (accountsResources) |
|  | 7-9 | `api/accounts.test.ts` | list with counts, order figures, paging and sort |
|  | 10-13 | `api/privacy.test.ts`, `api/accounts.test.ts` | one account read: figures, consent records, risk, guest, 404 |
|  | 14-18 | `api/accounts.test.ts` | create and edit, EMAIL_TAKEN |
|  | 19-20 | `api/accounts.test.ts` | suspend and reactivate, refusals |
|  | 21 | `api/privacy.test.ts` | block and lift the block |
|  | 22-24 | `api/accounts.test.ts`, `api/security.test.ts` | make an account, passwords, end every session |
|  | 25-26 | `api/privacy.test.ts` | export closes the export request; anonymize |
|  | 27 | `api/accounts.test.ts` | IMEIs cut on an anonymized account's orders |
|  | 28-29 | `api/dataRequests.test.ts` | list and move requests |
| `customers/api/wallet.test.ts` (8) | 1-8 | `api/wallet.test.ts` | reads (figures, statement range and sort), writes with the key, refusals, hold and lift |
| `customers/components/badges.test.tsx` (3) | 1-3 | `components/shared/AccountStatus.test.tsx`, `lib/status.test.ts` | status square and word; unknown word as written; empty reads Unknown |
| `customers/hooks/usePrivacyMutations.test.tsx` (4) | 1-4 | `hooks/useAccountPrivacy.test.tsx` | anonymize and export refresh what the server changes; refusals leave no toast |
| `customers/lib/detailTabs.test.ts` (3) | 1-2 | `components/record/accountParts.test.ts`, `pages/AccountPage.test.tsx` | Financial part only with wallet:read (adapted: the part registry) |
|  | 3 | `lib/paths.test.ts` | the part's address |
| `customers/lib/filters.test.ts` (23) | 1-6 | `components/list/listAddress.test.ts`, `pages/AccountsPage.test.tsx` | read the address: defaults, tab becomes the strip chip, retired Flagged tab |
|  | 7 | `components/list/listAddress.test.ts` | other keys such as the page are kept |
|  | 8-9 | `components/requests/requestsAddress.test.ts`, `components/list/listAddress.test.ts` | search text and country kept when Data requests opens; request status only on that view |
|  | 10 | `components/requests/requestsAddress.test.ts` | a sort the view does not offer is dropped |
|  | 11-12 | `components/list/listAddress.test.ts` | filters on and cleared |
|  | 13 | `components/list/listAddress.test.ts`, `components/requests/requestsAddress.test.ts` | page read |
|  | 14-15 | `components/list/listAddress.test.ts`, `components/requests/requestsAddress.test.ts` | default sort of the list (account A to Z) and of the requests (deadline) |
|  | 16 | `components/list/listAddress.test.ts` | retired risk-level sort opens the default sort |
|  | 17-18 | `lib/paths.test.ts`, `components/list/listAddress.test.ts` | write page and sort; the address of a filtered list for links |
|  | 19-20 | `components/list/listAddress.test.ts` | what each population asks the server |
|  | 21 | `components/requests/requestsAddress.test.ts` | status menu of Data requests |
|  | 22-23 | `lib/filters.test.ts` | Refine filters and the list query |
| `customers/lib/input.test.ts` (5) | 1-5 | `components/profile/profileForm.test.ts` | tidying, email shape, changed fields |
| `customers/lib/paletteSource.test.ts` (7) | 1-7 | `lib/paletteSource.test.ts` | the Accounts palette source |
| `customers/lib/requests.test.ts` (10) | 1-10 | `components/requests/requestWords.test.ts` | numbers, kinds, statuses, spans, deadlines |
| `customers/lib/status.test.ts` (9) | 1-3 | `lib/status.test.ts` | status words, unknown word, empty |
|  | 4 | `components/status/reasons.test.ts` | suspend reasons |
|  | 5-6 | `components/shared/countries.test.ts` | storefront countries |
|  | 7-8 | `components/record/accountParts.test.ts` | the parts and the wallet permission |
|  | 9 | `lib/paths.test.ts` | record and part addresses |
| `customers/lib/text.test.ts` (17) | 1-2 | `components/overview/overviewText.test.ts` | createdByText |
|  | 3-10 | `components/security/securityText.test.ts` | devices, password, link words, last seen address |
|  | 11-12 | `components/security/securityText.test.ts`, `components/privacy/PrivacyPart.test.tsx` | last seen address of a guest (consent record), none |
|  | 13 | `components/overview/overviewText.test.ts` | since words |
|  | 14-16 | `components/privacy/consentLabel.test.ts` | consent words |
|  | 17 | `pages/AccountsPage.test.tsx` | isZeroMoney: dash for no spend and a guest wallet in the list cells |
| `customers/lib/walletInput.test.ts` (4) | 1-3 | `components/wallet/walletInput.test.ts` | amount and reason |
|  | 4 | `lib/idempotency.test.ts` | the key case |
| `customers/lib/walletStatement.test.ts` (5) | 1-5 | `components/wallet/walletStatement.test.ts` | day range to UTC filters (statementRange) |
| `customers/mocks/walletStore.test.ts` (3) | 1-3 | `mocks/walletStore.test.ts` | the wallet mock store |
| `customers/pages/CustomerDialogs.test.tsx` (26) | 1-4 | `components/profile/ProfilePart.test.tsx` | Edit details became the Profile form |
|  | 5-7 | `components/security/PasswordDialog.test.tsx` | password dialog |
|  | 8-9 | `components/security/MakeAccountDialog.test.tsx` | Create account became Make an account |
|  | 10 | `components/security/SignOutDialog.test.tsx` | sign out everywhere |
|  | 11-13 | `components/status/SuspendDialog.test.tsx` | suspend: reason, note, refusal |
|  | 14-15 | `components/status/ReactivateDialog.test.tsx` | reactivate and its refusal |
|  | 16-18 | `components/privacy/PrivacyDialogs.test.tsx` | block and unblock |
|  | 19-22 | `components/privacy/PrivacyDialogs.test.tsx` | export (asks first, cancelled, refusal) and anonymize after a warning |
|  | 23 | `hooks/useAccountPrivacy.test.tsx`, `api/accounts.test.ts`, `components/orders/OrdersPart.test.tsx` | IMEIs cut after anonymizing (the screen case anonymizes through the dialog, then reads the Orders part) |
|  | 24 | `components/privacy/PrivacyDialogs.test.tsx` | anonymize refusal stays in the dialog |
|  | 25-26 | `components/frame/actionRules.test.ts` | permissions of each action; the Owner keeps every action |
| `customers/pages/CustomerPage.test.tsx` (31) | 1-2 | `pages/AccountPage.test.tsx` | not found and a bad number |
|  | 3 | `pages/AccountPage.test.tsx` | server error with Retry |
|  | 4-7 | `pages/AccountPage.test.tsx` | names in the heading, breadcrumb and title; unknown status |
|  | 8 | `components/privacy/PrivacyPart.test.tsx` | no risk level whatever the server sends |
|  | 9 | `components/overview/OverviewPart.test.tsx` | the figures |
|  | 10-12 | `pages/AccountPage.test.tsx`, `components/record/accountParts.test.ts` | count on the menu, part in the address, unknown part opens Overview |
|  | 13-15 | `components/orders/OrdersPart.test.tsx` | Orders |
|  | 16 | `components/security/SecurityPart.test.tsx` | sign-in facts and buttons (Account tab became Security) |
|  | 17 | `components/overview/OverviewPart.test.tsx`, `components/security/MakeAccountDialog.test.tsx` | a guest: no password, Make an account |
|  | 18-20 | `components/security/SecurityPart.test.tsx`, `components/frame/actionRules.test.ts` | Sign out off with no session; Block IP… and the refused address |
|  | 21 | `components/overview/OverviewPart.test.tsx` | an anonymized account |
|  | 22-23 | `components/support/SupportPart.test.tsx` | Support |
|  | 24-28 | `components/privacy/PrivacyPart.test.tsx` | consents, data requests, permissions |
|  | 29-31 | `components/privacy/PrivacyPart.test.tsx` | risk: signals, no signals, score |
| `customers/pages/CustomerWallet.test.tsx` (11) | 1-3 | `components/wallet/FinancialPart.test.tsx` | the part, left out without wallet:read (an address naming it shows Overview), buttons off |
|  | 4-5 | `components/wallet/StatementPart.test.tsx` | statement and journal (needs ledger:read) |
|  | 6-10 | `components/wallet/AdjustWalletDialog.test.tsx`, `hooks/useDialogKey.test.tsx` | checks, key, refusals, new key per opening |
|  | 11 | `components/wallet/WalletHoldDialogs.test.tsx` | hold and lift |
| `customers/pages/CustomersPage.test.tsx` (39) | 1-8 | `pages/AccountsPage.test.tsx`, `components/frame/accountsNav.test.ts` | tabs and counts became the strip and the status counts; retired addresses; the Data requests link and its fallback |
|  | 9-23 | `pages/AccountsPage.test.tsx`, `components/list/listAddress.test.ts` | the table, sort, pager, error, filters and empty states |
|  | 24-34 | `components/requests/DataRequestsView.test.tsx` | Data requests |
|  | 35-39 | `components/create/AddAccountView.test.tsx` | adding an account |
| `merchants/api/catalog.test.ts` (13) | 1-13 | `api/ranks.test.ts` | ranks (6), fixed prices (6), service lookup (1) |
| `merchants/api/clients.test.ts` (41) | 1-6 | `api/accounts.test.ts` | list, counts, one account |
|  | 7-13 | `api/accounts.test.ts` | create and update |
|  | 14-22 | `api/wallet.test.ts` | wallet figures, statement, adjust, credit limit, statement file |
|  | 23-25 | `api/apiKeys.test.ts` | keys list and revoke |
|  | 26-33 | `api/accounts.test.ts` | details, status rules, sessions on suspend |
|  | 34-37 | `api/security.test.ts`, `api/accounts.test.ts` | security tools and their refusals |
|  | 38-41 | `api/apiKeys.test.ts`, `api/security.test.ts` | staff-made keys; the contract routes |
| `merchants/components/MerchantNote.test.tsx` (3) | 1-3 | `components/overview/OverviewPart.test.tsx` | status section, adapted: a former pending account is suspended with the migration's reason; a retired word is only a word; the suspension line |
| `merchants/hooks/useClientApiKeys.test.tsx` (1) | 1 | `hooks/useAccountApiKeys.test.tsx` | new key dropped from the mutation cache |
| `merchants/hooks/useSecurityMutations.test.tsx` (1) | 1 | `hooks/useSecurityMutations.test.tsx` | temporary password dropped from the mutation cache |
| `merchants/lib/amount.test.ts` (7) | 1-5 | `components/wallet/amount.test.ts` | parseAmount, amountInput |
|  | 6-7 | `components/ranks/rankForm.test.ts` | parsePercent |
| `merchants/lib/billing.test.ts` (3) | 1-3 | `components/billing/billingWords.test.ts` | invoice kinds and states |
| `merchants/lib/details.test.ts` (6) | 1-6 | `components/profile/profileForm.test.ts` | defaults, changed fields, tidying, length limits |
| `merchants/lib/filters.test.ts` (19) | 1-3 | `pages/AccountPage.test.tsx`, `components/record/accountParts.test.ts` | open part from the address, fall back, none for a role with none |
|  | 4-6 | `components/list/listAddress.test.ts` | filters in the address, written, cleared |
|  | 7-8 | `components/frame/useAccountsAddress.test.tsx`, `components/list/listAddress.test.ts` | the view change drops page and sort; All leaves no key |
|  | 9 | `pages/AccountsPage.test.tsx` | retired Verification keys dropped |
|  | 10-12 | `components/list/listAddress.test.ts`, `lib/paths.test.ts` | page and sort |
|  | 13-17 | `components/list/listAddress.test.ts`, `pages/AccountsPage.test.tsx` | retired Verification and Pending approval addresses kept working |
|  | 18-19 | `components/list/listAddress.test.ts`, `lib/filters.test.ts` | API filters and Refine filters |
| `merchants/lib/helpers.test.ts` (12) | 1-4 | `lib/ranks.test.ts` | rank labels, retail excluded, default rank |
|  | 5 | `components/apikeys/keyState.test.ts` | key state |
|  | 6-7 | `components/create/addAccountForm.test.ts` | email and country input |
|  | 8 | `components/overview/overviewText.test.ts` | joined days |
|  | 9-12 | `lib/paths.test.ts`, `components/list/listAddress.test.ts`, `components/record/accountParts.test.ts` | addresses and parts |
| `merchants/lib/keyInput.test.ts` (7) | 1-7 | `components/apikeys/keyInput.test.ts` | address lines, rate limit, expiry day |
| `merchants/lib/paletteSource.test.ts` (5) | 1-5 | `lib/paletteSource.test.ts` | the Accounts palette source |
| `merchants/pages/MerchantApiKeys.test.tsx` (19) | 1-5 | `components/apikeys/ApiPart.test.tsx` | New key… (adapted: the former pending merchant is suspended; the Owner rule is new) |
|  | 6-11 | `components/apikeys/KeyDialogs.test.tsx` | creating a key |
|  | 12-16 | `components/apikeys/KeyDialogs.test.tsx` | Limits… |
|  | 17 | `components/apikeys/KeyDialogs.test.tsx`, `components/apikeys/ApiPart.test.tsx` | Limits… on live keys only |
|  | 18-19 | `components/apikeys/ApiPart.test.tsx` | the missing permission named; the retired scopes not shown |
| `merchants/pages/MerchantBillingAudit.test.tsx` (11) | 1-5 | `components/billing/InvoicesPart.test.tsx`, `components/billing/PaymentsPart.test.tsx` | Billing became Invoices and Payments |
|  | 6-11 | `components/audit/ActivityPart.test.tsx` | Audit became Activity Log (Show more is the footer pager) |
| `merchants/pages/MerchantPage.test.tsx` (22) | 1-3 | `components/overview/OverviewPart.test.tsx` | header rows and figures, wallet below zero |
|  | 4-5 | `components/overview/OverviewPart.test.tsx` | an invited account is active; a former pending account is suspended (adapted) |
|  | 6-8 | `components/overview/OverviewFlows.test.tsx`, `components/status/SuspendDialog.test.tsx`, `components/status/ReactivateDialog.test.tsx` | reactivate and suspend (adapted: no Activate account) |
|  | 9-10 | `pages/AccountPage.test.tsx` | not found and a bad number |
|  | 11-12 | `components/rank/RankChangeDialog.test.tsx`, `components/overview/OverviewFlows.test.tsx` | group menu became Change rank… |
|  | 13 | `components/wallet/CreditLimitDialog.test.tsx` | credit limit |
|  | 14-18 | `components/wallet/AdjustWalletDialog.test.tsx` | adjust wallet: checks, body, key per opening, refusals |
|  | 19 | `components/frame/actionRules.test.ts` | every action off for a role without its permission |
|  | 20 | `pages/AccountPage.test.tsx`, `components/record/OpenAccount.test.tsx` | nothing to show for the role |
|  | 21 | `components/rank/RankChangeDialog.test.tsx` | the rank list needs groups:read |
|  | 22 | `components/overview/OverviewPart.test.tsx` | Reactivate… off without the permissions (was Activate account) |
| `merchants/pages/MerchantPageTabs.test.tsx` (30) | 1-3 | `pages/AccountPage.test.tsx`, `components/record/accountParts.test.ts`, `components/list/listAddress.test.ts` | tabs became parts; opens on Overview; retired Verification address |
|  | 4-5 | `components/record/accountParts.test.ts`, `pages/AccountPage.test.tsx` | parts by permission |
|  | 6-8 | `components/orders/OrdersPart.test.tsx` | Orders |
|  | 9-12 | `components/wallet/StatementPart.test.tsx` | statement lines, +$ and -$, sort, journal |
|  | 13 | `components/wallet/AdjustWalletDialog.test.tsx` | an adjustment is the newest line, with its journal |
|  | 14-15 | `components/wallet/FinancialPart.test.tsx` | statement download and its refusal |
|  | 16-17 | `components/wallet/StatementPart.test.tsx`, `components/wallet/FinancialPart.test.tsx` | error with Retry; download and journal off without the permissions |
|  | 18-19 | `components/prices/PricesPart.test.tsx` | Pricing became Prices |
|  | 20-24 | `components/prices/PriceDialogs.test.tsx` | add, edit, new price, remove, empty service menu |
|  | 25 | `components/prices/PricesPart.test.tsx` | read-only role |
|  | 26-30 | `components/apikeys/ApiPart.test.tsx` | API access became API |
| `merchants/pages/MerchantProfile.test.tsx` (13) | 1-4 | `components/profile/ProfilePart.test.tsx`, `components/overview/OverviewPart.test.tsx` | Profile rows: the account, business details, notes; no referral code; Edit details off without clients:update |
|  | 5-10 | `components/profile/ProfilePart.test.tsx`, `components/profile/profileForm.test.ts` | Edit details became the Profile form |
|  | 11-12 | `components/overview/OverviewPart.test.tsx`, `components/overview/OverviewFlows.test.tsx` | the suspension line moved to Overview status |
|  | 13 | `pages/AccountsPage.test.tsx` | invitation pending in the table |
| `merchants/pages/MerchantSecurity.test.tsx` (15) | 1-3 | `components/security/SecurityPart.test.tsx` | sign-in facts |
|  | 4-7 | `components/security/PasswordDialog.test.tsx`, `components/security/MakeAccountDialog.test.tsx` | password dialog |
|  | 8 | `components/security/SignOutDialog.test.tsx` | sign out everywhere |
|  | 9-10 | `components/security/Reset2faDialog.test.tsx` | reset two-step sign-in |
|  | 11-15 | `components/security/SecurityPart.test.tsx` | resend verification, buttons off, session count only, permissions |
| `merchants/pages/MerchantsActions.test.tsx` (8) | 1-4 | `components/create/AddAccountView.test.tsx` | invite became +Add Account (adapted: an unexpected status in the answer still opens the account) |
|  | 5-8 | `pages/AccountsPage.test.tsx`, `pages/AccountsActions.test.tsx`, `components/frame/actionRules.test.ts` | permissions: reader, groups-only role lands on Ranks, no access |
| `merchants/pages/MerchantsPage.test.tsx` (11) | 1-11 | `pages/AccountsPage.test.tsx`, `components/list/listAddress.test.ts` | strip and counts, table, filters, past-the-end page |
| `merchants/pages/MerchantsTabs.test.tsx` (13) | 1-9 | `components/ranks/RanksView.test.tsx`, `components/ranks/RankForm.test.tsx` | Groups tab became Ranks, +Add Rank and Edit rank |
|  | 10-13 | `components/list/listAddress.test.ts`, `pages/AccountsPage.test.tsx` | retired Verification and Pending approval addresses |

New cases beyond the ports sit in the same files (for example the Owner rule, the footer pagers, the guest's Seen from row and the part registry).

## Left open

- **Documents that still name the two features.** `docs/briefs/{merchants,customers}.md`, `docs/slices/{merchants,customers}.json`,
  `docs/feature-plan.json` and `docs/ROUTE_COVERAGE.md` mention them; the route coverage no longer lists a route as tagged twice.
- **Toast words** are the data layer's hooks' words (for example "<name> added", "Account created", "Data exported"); the wallet area keeps its own two hooks'
  words ("New balance $X", "Saved <file>").
