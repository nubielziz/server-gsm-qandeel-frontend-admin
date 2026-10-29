# 015 Client state: no state library

**Context.** The brief allows Redux (or similar) only for a concrete need that Refine, TanStack Query and React state do not cover.

**Inventory of client state in the demo.** Server data (orders, merchants…) → TanStack Query via Refine. Page state (tab, filters, page, selected row) → URL search params + `useState`. Row selection for bulk actions → `useRowSelection` (component state). Theme and density → a small `PreferencesContext` persisted in `localStorage`. Open drawer/dialog → component state. Toasts → the notification provider's own store. Command palette → component state.

**Decision.** No client-state library. None of the above needs cross-tree shared mutable state beyond one context.

**Consequences.** Fewer concepts for contributors; if a real need appears (e.g. cross-page multi-select), it gets its own decision record.
