# 009 Tables

**Context.** The demo's `table()` helper renders sortable headers with `aria-sort`, optional row selection with select-all, whole-row click, responsive column hiding (`hide: 'sm'|'md'|'lg'|'xl'`), a pager ("1–25 of 340", Page x of y) and an empty block. The demo sorts and pages in memory; the API pages on the server (simple-rest).

**Options.** (a) `@refinedev/core` `useTable` (server pagination/sort/filter state, URL sync) + our own `DataTable`. (b) `@refinedev/react-table` + TanStack Table (column model, selection, sorting) + our markup.

**Decision.** (a). `DataTable` takes `columns` (`key`, `label`, `render`, `sortField?`, `num?`, `hide?`, `className?`), `rows`, `rowKey`, `onRowClick?`, `selection?` (from a small `useRowSelection` hook), `sort` + `onSortChange`, `pagination` + `onPageChange`, and `state` (loading → skeleton rows, error → `ErrorState`, empty → `EmptyState`). A `useDataTable` helper adapts Refine's `useTable` result (`tableQuery`, `result`, `currentPage`, `setCurrentPage`, `sorters`, `setSorters`, `filters`, `setFilters`) to those props. Client-only lists (small arrays inside a payload) can pass rows without pagination.

**Why not TanStack Table.** The demo's table is simple; TanStack's column model and its own selection/sort state would duplicate Refine's state and add a second abstraction for every page.

**Consequences.** Remove `@refinedev/react-table` and `@tanstack/react-table`. One table component with the demo's exact markup and keyboard behaviour.
