Feature brief: **support**. Read `/home/saifi/gsm-project/frontend-admin/docs/briefs/_common.md` first (worktree, rules, checks, HANDOFF.md); your worktree is `/home/saifi/gsm-project/worktrees/support`, your slice `/home/saifi/gsm-project/frontend-admin/docs/slices/support.json` (10 endpoints).

# Feature: support (`/support`)
Demo: `/home/saifi/gsm-project/frontend-admin/reference/gsm-admin/src/js/49-p-support.js` (read it all) and the ticket helpers in `12-state-b2c.js` (`supportStats`, `ticketLate`, `ticketTarget`, `lastPublic`, `ticketBadge`, ticket mutations, macros). Entity rows in `src/lib/api/schema.gen.ts`: `SupportTicketRow`, `TicketMessageRow`, `ReplyTemplateRow`. Drop `modeGate` and the demo's "simulate ticket" (MISMATCHES M9).

## Screen (inbox + thread, as the demo)
- Page permission `support:read` (`support:*` → read/update per MISMATCHES M7); reply and note need `support:reply`; templates management needs support create/update/delete.
- Inbox: filters Open / Overdue (`late`) / Mine / Resolved / All and who (all / customers / merchants) and search, in the URL (`filter`, `who`, `q`, `ticket=<id>` for the open thread). Honour `/support?filter=late` and `/support?customerId=<id>` (ARCHITECTURE §5.2: a customer's tickets; show a removable "Customer: <name>" chip). Overdue and SLA timers come from the server (assumed DTO fields `dueAt`, `late: boolean`, `lastPublicAt`); the client only formats them.
- Thread: messages with public/internal styling, the order link (`orderPath` from `@/features/orders`, mount `OrderDrawerHost`), the customer/merchant link. Composer: Reply (`POST /:id/reply`; channel email or Telegram if the DTO says which are available; assumed body `{ body, channel? }`) and Internal note (`POST /:id/note`), macro picker that inserts a reply template with its variables filled from the ticket's order (the server may also render them: if the template list returns raw `{{variables}}`, fill only the documented ones and leave unknown ones visible), priority select, assignee select (staff list from `@/features/access`: `useStaffList` or the list function its index exports), Resolve / Reopen (`PATCH` status). Show the server's errors in the composer.
- New **Templates** view (button "Manage templates" or a tab, URL `view=templates`): reply-templates CRUD with a preview of the variables.

## Export for the customers page
The customers page shows "Open in Support" today. Export from `index.ts` a self-contained `CustomerTickets({ customerId })` list (subject, status badge, updated, opens `/support?ticket=<id>`), so the lead can embed it in the customer page's Support tab after both features merge (note it in HANDOFF under SHARED-NEEDS).

## Mocks, tests, bookkeeping
- Mocks inside the feature from the demo seed (`S.tickets` with messages, macros); reply and note append messages; PATCH changes priority/assignee/status. Split files ≤ ~200 lines.
- Tests: api, lib, each filter in URL incl. `customerId`, open thread, reply and note (server error shown in the composer), macro insert, priority/assign/resolve/reopen, templates CRUD, `CustomerTickets`, permissions. Helpers in `src/features/support/test/`.
- `manifest.ts` (page `support`, heading as the demo's h1, registry, palette source for tickets by subject/number if the list route searches). `HANDOFF.md`: mismatch rows SUPPORT-1…, assumed contracts, SHARED-NEEDS (embedding), deep links, backend questions. Coverage 10/10.
