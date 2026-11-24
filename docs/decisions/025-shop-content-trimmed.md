# 025 Shop content trimmed

**Context.** On 2026-11-24 the owner asked to remove the Landing pages tab and the TAC catalogue tab of the Shop content page and to keep only the
index section of its Search tab: landing pages were never written, the TAC catalogue only fills by hand and no usable free list exists, and the
search answers well with the synonyms it ships with. The backend retires the routes in its decision 068.

**Decision.**

1. **Shop content has three tabs:** Content and legal (the tab the page opens on), Help centre and Search. The page opens for
   `storefront:read` or `legal:read`; `catalog:read` no longer opens it.
2. **Landing pages are gone:** the tab, its figures, table, row menu and type filter, the "Generate drafts" dialog and its list of drafts, the
   landing kinds of a content page (a page is a static page or a blog post), their mock rows and their tests.
3. **The TAC catalogue is gone:** the tab, its table and dialogs, its API functions, hooks, mock routes and tests. The device name of the risk
   queue is not touched.
4. **The Search tab is the index panel alone:** the engine's state, the last runs, the queues, the last error and "Rebuild index". Synonyms,
   pinned results, "Test a search", the report and the hidden terms are gone with their API functions, hooks, forms, mock routes and tests; the
   tab has no sections and reads no `?section=`.
5. **Old addresses** (`/storefront?tab=landing`, `?tab=tac`, `?tab=search&section=pins`) open Shop content on a tab that exists and are never read
   as an old listings link.

**Routes no longer called.** `POST /admin/content-pages/generate`; the four `/admin/tac-catalog` routes; the four `/admin/search/synonyms` routes,
the four `/admin/search/pins` routes, the three `/admin/search/hidden-terms` routes, `GET /admin/search/report` and `GET /admin/search/preview`.
