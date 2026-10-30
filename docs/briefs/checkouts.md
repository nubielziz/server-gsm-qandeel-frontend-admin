Feature brief: **checkouts**. Read `/home/saifi/gsm-project/frontend-admin/docs/briefs/_common.md` first (worktree, rules, checks, HANDOFF.md); your worktree is `/home/saifi/gsm-project/worktrees/checkouts`, your slice `/home/saifi/gsm-project/frontend-admin/docs/slices/checkouts.json` (3 endpoints).

# Feature: checkouts ("Abandoned checkouts", `/checkouts`)
Demo: `/home/saifi/gsm-project/frontend-admin/reference/gsm-admin/src/js/51-p-checkouts.js` (read it all) and its helpers in `12-state-b2c.js` (abandoned checkout selectors, reminder sending). Entity rows: `CheckoutSessionRow`, `ConsentRecordRow` in `src/lib/api/schema.gen.ts`. Drop `modeGate`.

## Decisions
- **Map rule wins (MISMATCHES M1):** a recovery email goes once, and only to customers with marketing consent. The list shows consent per row; the "Remind" action is offered only for rows the server marks eligible (assumed DTO fields `marketingConsent: boolean`, `recoveryEmailedAt: string | null`, `canRecover: boolean`); rows without consent say why there is no button. The demo's "remind everyone with an email" becomes "send to the eligible ones": `POST /admin/checkouts/recover` with the selected ids (assumed body `{ ids: number[] }`); the answer says how many were sent and how many were skipped and why; show it.
- Page permission `growth:read`; sending needs `growth:send`; the funnel needs `reports:growth` (hide the panel without it).
- Tabs or filter as the demo (`Needs a reminder` / `All`, URL `filter`), search by email, the demo's columns (email masked as the server sends it, service, value, when, consent, recovery status). Selection + bulk "Send reminder" for eligible rows.
- New **Funnel** panel (`GET /admin/reports/funnel`): check → payment started → paid → delivered with the step-to-step rates, period selector if the route takes one (assumed `days`), like the dashboard's storefront funnel layout in `40-p-dashboard.js` (`storefrontPanel`). Numbers from the server only.

## Mocks, tests, bookkeeping
- Mocks inside the feature from the demo seed (`S.checkouts`, consent flags; funnel computed in the mock). Split files ≤ ~200 lines.
- Tests: api, lib, filter in URL, consent hides the button, bulk send with a partial skip summary, funnel render, permissions. Helpers in `src/features/checkouts/test/`.
- `manifest.ts` (page `checkouts`, heading as the demo's h1, registry if you use one). `HANDOFF.md`: mismatch rows CHECKOUTS-1… (consent-only recovery confirmed, assumed body and fields, funnel panel new), backend questions. Coverage 3/3.
