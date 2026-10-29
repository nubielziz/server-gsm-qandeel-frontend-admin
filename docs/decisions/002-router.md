# 002 Router integration

**Context.** The demo routes by hash (`#/orders`, `#/merchants/:id`, `#/customers/:id`) and keeps tab/filter state in memory. `@refinedev/react-router` 2 supports React Router 7.

**Options.** (a) React Router 7 with `@refinedev/react-router`, browser history. (b) Hash router to mirror the demo. (c) TanStack Router (no official Refine v5 binding).

**Decision.** (a). `BrowserRouter`; paths use the demo page ids: `/dashboard`, `/orders`, `/merchants`, `/merchants/:id`, `/customers`, `/customers/:id`, `/support`, `/risk`, `/checkouts`, `/services`, `/suppliers`, `/storefront`, `/finance`, `/commissions`, `/refunds`, `/access`, `/settings`, `/audit`; plus `/login`, `/login/2fa`, `/login/setup-2fa`, `/set-password`. `/` redirects to `/dashboard`. Page state worth sharing (tab, filters, selected item, page) lives in URL search params (`?tab=disputes`), so the demo's `go(route, {tab})` deep links become plain links.

**Consequences.** Real URLs and back/forward work. Hosting must fall back to `index.html` for unknown paths (`serve -s` / nginx `try_files`); noted in README. Refine's `syncWithLocation` is used only for a page's main table so tabs do not fight over the query string.
