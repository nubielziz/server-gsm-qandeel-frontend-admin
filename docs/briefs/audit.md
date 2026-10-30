Feature brief: **audit**. Read `/home/saifi/gsm-project/frontend-admin/docs/briefs/_common.md` first (worktree, rules, checks, HANDOFF.md); your worktree is `/home/saifi/gsm-project/worktrees/audit`, your slice `/home/saifi/gsm-project/frontend-admin/docs/slices/audit.json` (2 endpoints).

# Feature: audit ("Audit log", `/audit`, page permission `audit:read`)
Demo: `/home/saifi/gsm-project/frontend-admin/reference/gsm-admin/src/js/47-p-audit.js` (read it all) and `logAudit` in `11-state.js` for the record shape. Entity row: `AuditLogRow` in `src/lib/api/schema.gen.ts`. Drop `modeGate`.

## Screen (as the demo)
- Filters in the URL: actor ("Everyone" or one staff member: the list from `@/features/access` (its exported staff list hook or function); "System" too), record type ("All records" + the entity types the server uses), search, date range if the route takes one (assumed `from`/`to`). Clear filters.
- List newest first with the demo's columns (time, actor, verb, record, IP). Paging: the demo's "Show more" (`aud-more`) maps to loading the next page of `GET /admin/audit-logs` (append, keep the scroll); a count from `x-total-count`.
- Each row expands (`aud-toggle`, `aria-expanded`) to the before/after diff (`GET /admin/audit-logs/:id` when the list row has no diff: assumed). Render values as text, never as HTML; long JSON in a scrollable `pre`.
- "Open record" (`aud-go`) uses the deep links of ARCHITECTURE §5.2 by entity type (order → `orderPath` from `@/features/orders` with `OrderDrawerHost` mounted on this page, merchant → `/merchants/<id>`, customer → `/customers/<id>`, supplier → `/suppliers?supplier=<id>`, staff → `/access?tab=admins`, others → no link). Offer it only when `useCanOpenPage` (`@/lib/auth/useCanOpenPage`) allows the target page.

## Mocks, tests, bookkeeping
- Mocks inside the feature from the demo seed (`S.audit`), mapped to the API DTO (actor id/name/type, verb, entity type/id/label, diff before/after, ip, createdAt); filters, search and paging honoured. Split files ≤ ~200 lines.
- Tests: api, lib (entity → link), filters in URL, show more appends, expand diff, open record links, permissions. Helpers in `src/features/audit/test/`.
- `manifest.ts` (page `audit`, heading as the demo's h1, registry). `HANDOFF.md`: mismatch rows AUDIT-1… (paging instead of the in-memory list, assumed filters and diff fields), backend questions. Coverage 2/2.
