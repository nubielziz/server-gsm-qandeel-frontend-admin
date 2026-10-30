# Architecture

The GSM admin console: a Refine (headless) + React + TypeScript app that ports the static demo `reference/gsm-admin` and talks to the `/admin` API designed in `reference/gsm-map`. The server owns every business rule; this app shows data, collects input, calls the API and shows the server's answer.

Decisions behind each choice: `docs/decisions/`. Endpoint list: `docs/route-manifest.json` (+ readable `docs/route-manifest.md`). Which feature owns which endpoint: `docs/feature-plan.json`.

## 1. Folder structure

```
src/
  main.tsx                 entry: fonts, CSS, optional dev mocks, <App/>
  app/                     App.tsx (<Refine> + providers), routes.tsx, resources.ts (nav + data registry), layout/ (shell)
  app/providers/           dataProvider, authProvider, accessControlProvider, notificationProvider
  lib/api/                 client.ts (fetch), errors.ts (ApiError, problem+json), csrf.ts, query.ts (simple-rest params),
                           types.ts (Id, Money, IsoDateTime, ListQuery…), schema.gen.ts (generated entity rows), registry.ts
  lib/query/               useApiQuery / useApiMutation (TanStack Query + Refine invalidation + toasts)
  lib/format/              money, numbers, dates, relative time (ports of the demo's money/ago/fmtDate…)
  lib/auth/                permission matching, current-staff hook
  components/ui/           shared kit ported from demo 20-ui.js / input.css (Button, Panel, DataTable, Modal…)
  components/charts/       React SVG charts ported from demo 30-charts.js
  features/<name>/
    api/                   one exported function per endpoint (+ resources.ts: data-provider registry entries)
    types/                 DTOs for this feature (built from schema.gen.ts rows, narrowed: enums, joins)
    hooks/                 data + action hooks used by components
    components/            presentational pieces (≤ ~200 lines each)
    pages/                 route-level components; they only compose. pages/index.ts is a separate entry that
                           app/routes.tsx loads lazily (one chunk per feature); index.ts never re-exports pages
    index.ts               public surface: what other features and app/ may import (api, hooks, types, shared
                           components, the data-registry entries, palette sources)
  mocks/                   dev-only MSW layer (handlers per feature, seed from the demo). Deletable. Never in prod.
  styles/                  index.css (tokens + component classes from the demo's input.css)
```

Rules: features import other features only through `@/features/<name>` (their `index.ts`), never deep paths; inside a feature, files import each other by relative path. Only `app/routes.tsx` may import `@/features/<name>/pages`. `components/ui` and `lib/*` never import from `features/*` or `app/*`. Nothing but `src/main.tsx` and tests imports `src/mocks` or `msw`. Path alias `@/` = `src/`. All of this is enforced by ESLint.

## 2. Data flow

```
component → feature hook → feature api function → lib/api client (fetch) → /admin API
                       ↘ Refine data hooks (useTable/useOne/useForm) → dataProvider → registry → feature api function
```

- **lib/api/client.ts** is the only place that calls `fetch`. It prefixes `VITE_API_BASE_URL`, sends `credentials: "include"` (httpOnly session cookie), JSON bodies, the `X-CSRF-Token` header on every non-GET request, and turns any non-2xx answer into an `ApiError` (see §4). Helpers: `apiGet`, `apiSend` (POST/PUT/PATCH/DELETE), `apiList` (reads `x-total-count`), `apiDownload` (blob → file, for CSV/exports).
- **Feature api functions**: one exported function per endpoint, typed request/response, JSDoc with what + why + `@route METHOD /path` (exact manifest path, `:id` placeholders kept). Example: `suspendStaff(id, body)` → `POST /admin/staff/:id/suspend`.
- **CRUD resources**: the `dataProvider` does not build URLs itself. It converts Refine params (pagination, sorters, filters) into a `ListQuery` (simple-rest: `_start`, `_end`, `_sort`, `_order`, field filters, `q`) and dispatches to the feature function registered for that resource in `features/<name>/api/resources.ts` (e.g. `staff: { list: listStaff, show: getStaff, create: createStaff, update: updateStaff }`). So Refine hooks and our typed functions share one code path, and every call is tagged.
- **Non-CRUD endpoints** (actions, reports, previews): feature hooks wrap the typed function with `useApiQuery` / `useApiMutation` (TanStack Query, same client Refine uses). A mutation declares what it invalidates (`invalidates: [{ resource: "staff", id }]`) and its success toast; errors go through the shared error handling.
- **Query client**: one per app mount (`app/queryClient.ts`), shared by Refine and `lib/query`. Refine's `['auth', 'check']` query never refetches on its own (a refetch would swap the shell for its loading screen); an expired session surfaces as a 401 on the next call, which signs the user out.
- **Server state** lives only in the query cache. No client-state library. UI preferences (theme, density) live in a small React context persisted to `localStorage`. Page state worth a deep link (tab, filters, page) lives in URL search params.

## 3. Auth and access

- Session: httpOnly cookie set by the API; CSRF token sent as `X-CSRF-Token` on mutations (read from the readable cookie named by `VITE_CSRF_COOKIE`, else from the last `X-CSRF-Token` response header). See decision 006 for the assumptions the backend must confirm.
- Sign-in flow (`features/auth` screens, `authProvider`): `POST /admin/auth/login` (email + password) → the answer says whether a TOTP code or a first-time TOTP setup is next → `/login/2fa` (`POST /admin/auth/2fa`) or `/login/setup-2fa` (`POST /admin/auth/2fa/setup` returns the secret + QR, then the code goes to `POST /admin/auth/2fa`). Invite / reset links land on `/set-password?token=…` (`POST /admin/auth/password/set`).
- `authProvider.check` and `getIdentity` use `GET /admin/auth/me` (cached query). `getPermissions` returns `me.permissions`.
- `accessControlProvider.can` checks permission strings (`resource:action`, `resource:*`, `*`) against `me.permissions`. UI code asks with explicit permission strings taken from the manifest (`useCan({ resource: "staff", action: "staff:suspend" })` or `<RequirePermission perm="staff:suspend">`). CRUD rows with `x:*` map to `x:read` (list/show), `x:create`, `x:update`, `x:delete`.
- Hidden or disabled controls are only hints. The server enforces permissions and rules; its 403/409/422 answer is always shown.

## 4. Errors and query states

- `ApiError` (extends `Error`, compatible with Refine `HttpError`): `status`, `code`, `title`, `detail`, `type`, `fieldErrors` (from `errors[]`), `errors` (Refine form format), `requestId` (`X-Request-Id`), `retryAfter` (429).
- Field errors: Refine `useForm` maps `errors` onto fields automatically; action dialogs use `applyServerErrors(error, setError)`; anything left over shows in the dialog's error slot.
- Special codes: `UNAUTHORIZED` 401 → sign out to `/login`; `ACCOUNT_SUSPENDED` 403 → `/login?reason=suspended` (dedicated message); `IP_NOT_ALLOWED` 403 → `/login?reason=ip`; `FORBIDDEN` 403 → "no permission" state in place, no sign-out; `RATE_LIMITED` 429 → toast with the wait time; network failure → error state with Retry.
- Every data view renders through `QueryState` (or DataTable's built-in states): **Loading** (skeleton in the table's shape), **Empty** (what it is + what to do), **Error** (what failed, request ID, Retry), **Success** (toast stating what changed). These replace the demo's loading/empty/error mode switcher.

## 5. How a feature is built

1. Read the brief (`docs/briefs/<name>.md`: demo functions to port, assumed contracts, acceptance criteria) and the feature's route slice (`docs/slices/<name>.json`, from `npm run routes:slices`). Look up demo code with Serena, function by function.
2. `types/`: DTOs from `schema.gen.ts` rows (`Pick`/`Omit` + narrowed enums + joined fields the screen needs).
3. `api/`: one function per endpoint with the JSDoc + `@route` tag; `api/resources.ts` registers CRUD resources.
4. `hooks/`: list/detail/action hooks (`useTable`/`useOne`/`useForm` for CRUD, `useApiQuery`/`useApiMutation` otherwise).
5. `components/` then `pages/`: port every screen, tab, filter, dialog, drawer, empty/loading/error state and client UX guard of the demo page, with the kit from `components/ui`.
6. Register through `manifest.ts` (export `manifest: FeatureManifest`, type in `src/app/featureManifest.ts`): the page (`name`, `heading`, `list`/`detail` loaders written as `() => import('./pages').then((m) => m.XPage)`, optional any-of `permission`), the data `registry`, `palette` sources, and `useNavCounts` (dashboard only). `src/app/features.ts` finds every manifest; no shared file is edited. Export the public surface other features may use from `index.ts`.
7. Mocks inside the feature: `mocks/index.ts` exports `mocks: FeatureMocks` (`handlers`, `reset`; type in `src/mocks/featureMocks.ts`), with stores and seed mapping next to it. `src/mocks/handlers/index.ts` finds them. Mock files may import `msw`, `@/mocks/*` helpers (`guard`, `latency`, `problem`, `crudHandlers`, `Collection`, `loadDemoState`) and other features' `mocks`; feature code never imports its own mocks (lint). Features built before this rule (access, orders, finance ledger, settings) keep their mocks in `src/mocks`.
8. Tests next to the code, test helpers inside the feature folder (`src/test/renderApp.ts` renders the whole app against the mock API: `setupMockApi`, `mockMe`, `renderApp`, `signInAs`). Then `npm run typecheck && npm run lint && npm run build && npm test` and `node scripts/check-route-coverage.mjs --feature <name>` (read-only in this mode).

### 5.1 Building features in parallel

- Each feature is built in its own git worktree on `feat/<name>` (`npm run feature:worktree -- add <name>`, at `../worktrees/<name>`, sharing `node_modules` by symlink). The implementer edits only `src/features/<name>/**`.
- Shared files (`src/app`, `src/lib`, `src/components/ui`, `src/mocks`, `src/test`, `package.json`, the lockfile, `docs/`, `PROGRESS.md`, other features) are the lead's. An implementer that needs a change there lists it under SHARED-NEEDS in `src/features/<name>/HANDOFF.md` and works around it locally; the lead adds it at merge time.
- `HANDOFF.md` also carries the feature's mismatch rows (numbered `<NAME>-1`, `<NAME>-2`…), assumed contracts, deep links it uses and open backend questions. The lead moves them into `docs/` (MISMATCHES numbers in merge order) and deletes the file in the squash commit.
- Merge order is finish order: Opus review (max 2 rounds), `git merge --squash feat/<name>`, typecheck + build at once, one conventional commit, then `npm run feature:worktree -- remove <name>`.

### 5.2 Deep links between pages

Pages link to each other by address. Each page honours these parameters (pages not built yet must add them when they are):

| Address | Opens |
|---|---|
| `/orders?tab=…&type=…&channel=b2b\|b2c&pastSla=true&supplierId=…&clientId=…&q=…` | the Orders list with those filters (`ordersListPath` in `@/features/orders`) |
| `/orders?order=<id>` (on any page that mounts `OrderDrawerHost`) | that order's drawer (`orderPath`) |
| `/suppliers?supplier=<id>` | Suppliers with that supplier selected |
| `/services?belowFloor=true` | Services priced below cost plus minimum profit |
| `/finance?tab=payments` | Finance on the pending deposits |
| `/merchants?tab=pending`, `/merchants/<id>` | merchants waiting for approval; one merchant |
| `/customers/<id>` (`?tab=orders\|account\|support\|consents\|risk`) | one customer |
| `/commissions` | commissions (accruals ready to approve first) |
| `/risk` (`?tab=queue`) | the held-orders queue |
| `/refunds?tab=disputes`, `/refunds?tab=refunds&status=requested\|failed` | disputes; refunds by status |
| `/support?filter=late`, `/support?customerId=<id>` | late tickets; one customer's tickets |
| `/settings?tab=tax` | tax and exchange rates |
| `/access?tab=…` | an Admins and access tab |

## 6. Naming

- Files: components `PascalCase.tsx`, everything else `camelCase.ts`. One component per file.
- API functions: verb + entity: `listStaff`, `getStaff`, `createStaff`, `updateStaff`, `deleteIpRule`, action endpoints use the action verb: `suspendStaff`, `approvePayment`, `previewBulkPrice`, `applyBulkPrice`.
- Hooks: `use` + noun/verb: `useStaffList`, `useSuspendStaff`. Types: `StaffUser`, `SuspendStaffBody`, `StaffListFilters`.
- Refine page resources use the demo page ids (`orders`, `merchants`, `access`…); data resources use the API path segment (`staff`, `ip-rules`, `ledger/transactions`).
- API JSON is camelCase; money is a 4-decimal string (`Money`), dates are ISO strings (`IsoDateTime`), IDs are numbers (`Id`).

## 7. Dev mock layer

`VITE_API_MOCKS=true` (dev server only) starts an MSW worker before the app renders. Handlers live in `src/mocks/handlers/<feature>.ts`; generic simple-rest CRUD comes from `src/mocks/crud.ts`; seed data comes from the demo's own seed (`src/mocks/seed/demo-state.json`, produced by `scripts/extract-demo-seed.mjs`) mapped to API shapes. Mocks fake responses only; they do not re-implement server rules. Production builds never include `src/mocks` (guarded by `import.meta.env.DEV`; checked in Phase 4).
