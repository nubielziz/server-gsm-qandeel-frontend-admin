# 005 Data provider and endpoint functions

**Context.** 238 admin endpoints: CRUD rows follow Refine simple-rest (`_start`, `_end`, `_sort`, `_order`, field filters, `x-total-count`, PATCH for update); the rest are actions, reports and previews. All HTTP must use native `fetch`; `@refinedev/simple-rest` uses axios. Every endpoint needs a typed, tagged client function.

**Options.** (a) Generic data provider building URLs from resource names, plus separate typed functions (two code paths to one endpoint). (b) Typed functions only, no Refine data hooks. (c) Typed functions as the single implementation; the data provider is a thin dispatcher over a registry of them; non-CRUD endpoints through TanStack Query hooks.

**Decision.** (c).
- `lib/api/client.ts`: the only `fetch` caller (base URL, credentials, JSON, CSRF, errors, `x-total-count`, downloads).
- `features/*/api/*.ts`: one function per endpoint with `@route`. `features/*/api/resources.ts` registers CRUD functions by resource name; `app/resources.ts` merges the registries.
- `app/providers/dataProvider.ts`: maps Refine params to `ListQuery` (eq → `field`, ne/gte/lte → `field_ne`/`field_gte`/`field_lte`, contains → `field_like`, `q` passes through, `in` → repeated key) and calls the registered function; throws if a resource or operation is not registered. `custom` is not implemented on purpose (non-CRUD calls go through typed functions).
- `lib/query`: `useApiQuery` / `useApiMutation` wrap `@tanstack/react-query` (direct dependency pinned to the major Refine uses, so it shares Refine's QueryClient), add Refine invalidation (`useInvalidate`) and toasts (`useNotification`).

**Consequences.** One code path per endpoint, used by both Refine hooks and custom hooks; coverage is checkable by `@route` tags. Feature authors write small functions instead of URL strings in components.
