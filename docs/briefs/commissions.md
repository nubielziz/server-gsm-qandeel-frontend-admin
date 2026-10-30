Feature brief: **commissions**. Read `/home/saifi/gsm-project/frontend-admin/docs/briefs/_common.md` first (worktree, rules, checks, HANDOFF.md); your worktree is `/home/saifi/gsm-project/worktrees/commissions`, your slice `/home/saifi/gsm-project/frontend-admin/docs/slices/commissions.json` (13 endpoints).

# Feature: commissions (`/commissions`)
Demo: `/home/saifi/gsm-project/frontend-admin/reference/gsm-admin/src/js/46-p-commissions.js` (read it all) and its helpers in `11-state.js` (`accrued`, agents, plans, approve accruals). Entity rows in `src/lib/api/schema.gen.ts`: `CommissionPlanRow`, `CommissionAssignmentRow`, `CommissionAccrualRow`. Drop `modeGate`.

## Page and permissions
- Page permission `commissions:read` (`commissions:*` → read/create/update/delete per MISMATCHES M7); approving needs `commissions:approve`.
- Header strip as the demo's `comStrip` (figures from the server: accruals list totals by status; no client sums that decide anything).
- Tabs (URL `tab`): **Accruals** (default; status sub-filter Ready (`accrued`) / Approved / All with counts and an agent filter in the URL; select rows (or all ready ones) and **Approve and pay out** via `POST /admin/commission-accruals/approve` with the ids (assumed body `{ ids: number[] }`): the server posts a ledger entry on each agent's wallet; show its summary (paid count and total, skipped with reasons)), **Agents** (the demo's agents tab built from commission assignments: merchant (agent), plan, since; assign a plan to a merchant (POST), change plan (PATCH), end (DELETE); merchant picker: private read-only lookup on `GET /admin/clients` without `@route`; "go to agent" opens `/merchants/<id>`), **Plans** (CRUD: referral or rebate, rate or amount, conditions as the DTO gives them; `plan-edit` dialog; delete refused by the server when assigned: show its message).

## Mocks, tests, bookkeeping
- Mocks inside the feature from the demo seed (`S.accruals`, agents, plans). Approve marks accruals approved and could add ledger entries through `@/mocks/ledger` helpers if they exist; otherwise only the accrual state (log it). Split files ≤ ~200 lines.
- Tests: api, lib, each tab, filters in URL, bulk approve with a partial skip summary, plan CRUD with a server refusal, assignment CRUD, permissions. Helpers in `src/features/commissions/test/`.
- `manifest.ts` (page `commissions`, heading as the demo's h1, registry). `HANDOFF.md`: mismatch rows COMMISSIONS-1…, assumed contracts, deep links (`/commissions`, `/merchants/<id>`), backend questions. Coverage 13/13.
