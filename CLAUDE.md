# GSM admin console (Refine port)

Port of the static demo `reference/gsm-admin` to a Refine app, typed against the API design in `reference/gsm-map`.
**Read `PROGRESS.md` first**: status, next feature, agent counters, blockers. Architecture: `docs/ARCHITECTURE.md`; decisions: `docs/decisions/`.

## Sources of truth
- API shape, entities, permissions, error codes: the map (`docs/route-manifest.json`, `reference/gsm-map/data/schema.mjs`).
- Screens, layout, copy, interactions: the demo (`reference/gsm-admin/src/js/*.js`, `DESIGN.md`).
- Every disagreement goes to `docs/MISMATCHES.md` (what, which source won, why). Never pick silently.
- Never open `reference/**/dist/**` (huge built files). Never load `routes.mjs`/`schema.mjs` whole: query the manifest.

## Navigation (Serena first)
- Serena = `mcp__serena__serena_repl` (object `s`; get a session id from `mcp__serena__initial_instructions`).
- Order: `s.lsp.get_symbols_overview` → `s.lsp.find_symbol` (body only for the symbol you need) → `s.lsp.find_referencing_symbols` → `s.fs.search_for_pattern` → `Read` with a line range as last resort.
- Edit existing code with `s.edit.replace_symbol_body` / `insert_after_symbol` / `insert_before_symbol` / `replace_content`. New files: `Write`.
- In a feature worktree, Serena still points at the main checkout: use it only to read (reference code, shared code); edit worktree files with Read/Edit/Write.
- Serena memories hold only short stable facts; status lives only in `PROGRESS.md`.

## Agents (hard limits)
- Roles: `implementer` (Sonnet) codes, `reader` (Haiku) looks up, `reviewer` (Opus) reviews. Tech decisions: Opus only (the lead).
- Depth 1 (subagents never spawn agents). At most 8 agents at once: ≤ 5 implementers, ≤ 2 reviewers, ≤ 3 readers. ≤ 10 agent calls per feature, ≤ 120 for the whole job; counters in PROGRESS.md. Never raise these. On rate-limit errors drop to 3 at once; no tight retry loops.
- Parallel features (docs/ARCHITECTURE.md §5.1): each implementer works in its own worktree on `feat/<name>`, only inside `src/features/<name>/`; shared changes go to `HANDOFF.md` under SHARED-NEEDS. Agents never run git commands that change state; only the lead merges (squash) and commits.
- Rolling pool: start the next ready feature when an implementer slot frees; if 3 finished features wait for review, start none.
- Never re-spawn the same task (after BLOCKED: one retry with a more specific brief). No polling or sleep loops. Review max 2 rounds. Subagent replies ≤ 200 words. Briefs are self-contained and say "do not spawn agents, do not commit".
- Same action/error 3 times, or 2 failed attempts → write the blocker (BLOCKED) in PROGRESS.md, free the slot, continue elsewhere.

## Code rules
- Refine + React + TypeScript strict. **All HTTP through native `fetch` via `src/lib/api`** (no axios/ky). Base URL from env.
- Layout: `src/app` (providers, routes, resources, shell) · `src/lib/api` (client, ApiError, problem+json) · `src/lib/format` · `src/components/ui` (shared kit) · `src/features/<name>/{api,components,hooks,types,mocks}/` + `index.ts` + `manifest.ts` (how the app finds the feature) · `src/mocks` (dev mock layer, deletable, never in prod builds).
- Components ≤ ~200 lines; pages only compose. Components never call the API: `features/*/api` → hooks → components.
- No demo data outside the mock layer (`src/mocks`, `src/features/*/mocks`). Keep the demo's look (tokens from `reference/gsm-admin/tailwind.config.cjs` + `input.css`).
- Server is the authority (ledger, risk, validation, permissions). Client guards are UX hints; always show the server's error.
- One exported function per endpoint, typed request/response, JSDoc with what + why + `@route METHOD /path` (exact manifest path).

## Comments (simple English)
- Every file starts with 1–3 lines: what it is and which demo page / route group it ports.
- Every non-trivial function, component, hook and type: short block comment saying what it does and why it exists.
- Inline comments only for non-obvious steps (guards, mappings, workarounds, business rules). No restating the code, no filler.

## Checks and git
- Done = `npm run typecheck && npm run lint && npm run build && npm test` green.
- Branch `feat/refine-admin`. Only the lead commits: once per finished feature (after review + green checks), conventional commits, body = routes covered, demo files ported, mismatches logged.
- Stage paths explicitly (never blind `git add -A`). Never push, force-push, `--no-verify`, or rewrite history.
