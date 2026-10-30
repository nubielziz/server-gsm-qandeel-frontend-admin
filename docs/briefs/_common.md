# Common brief for every feature implementer

Read this first, then your feature brief. Where they differ, the feature brief wins.

## Who you are and the hard rules
- You are the implementer (Sonnet) of ONE feature of the GSM admin console: a Refine 5 (headless) + React 19 + TypeScript strict + Tailwind 3 + React Query 5 + MSW port of the static demo `reference/gsm-admin`, typed against the API map `reference/gsm-map`.
- Do not spawn agents. Do not commit, and run no git command that changes state (status/diff/log are fine).
- Your final reply is at most 200 words.

## Where you work
- Your worktree is `/home/saifi/gsm-project/worktrees/<name>` (branch `feat/<name>`, from the head of `feat/refine-admin`; `node_modules` is a symlink, do not install anything). Run every command as `cd /home/saifi/gsm-project/worktrees/<name> && …`.
- Edit only `src/features/<name>/**` in your worktree, with Read/Edit/Write. Never touch `src/app`, `src/lib`, `src/components/ui`, `src/mocks`, `src/test`, `package.json`, the lockfile, `docs/`, `PROGRESS.md`, `CLAUDE.md` or another feature's folder. You may import other features through their public `index.ts` (`@/features/orders`), and the shared layers through their public paths.
- If you need a change outside your folder, do not make it: write it under SHARED-NEEDS in `src/features/<name>/HANDOFF.md` (exact file, what to add, why) and work around it inside your folder (for example a small local helper) so your feature still builds and passes.

## Sources (absolute paths, main checkout, read-only)
- Your routes: `/home/saifi/gsm-project/frontend-admin/docs/slices/<name>.json`, and only that slice (not the full route manifest). Entity types generated from the map: `src/lib/api/schema.gen.ts`.
- Demo: `/home/saifi/gsm-project/frontend-admin/reference/gsm-admin/src/js/*.js` and `DESIGN.md`. Read the demo with Serena (`mcp__serena__serena_repl`, object `s`, session id from `mcp__serena__initial_instructions`; it points at the main checkout: `s.lsp.get_symbols_overview`, `s.lsp.find_symbol`, `s.fs.search_for_pattern`, `s.fs.read_file` with a line range). Use Serena only to read; never `s.edit.*`. Never open `reference/**/dist/**`; never load `reference/gsm-map/data/routes.mjs` or `schema.mjs` whole.
- Rules and recipe: `CLAUDE.md` (code and comment rules), `docs/ARCHITECTURE.md` §5 (how a feature is built), §5.1 (parallel rules), §5.2 (deep links every page honours), `docs/MISMATCHES.md` (what was decided before).
- Style references (committed): `src/features/orders/**` (list with URL state, tabs with counts, drawer, bulk actions, palette source, tests) and `src/features/access/**` (dialogs, password and suspend flows, permission hints).

## How the feature plugs in (no shared file is edited)
- `src/features/<name>/manifest.ts` exports `manifest: FeatureManifest` (`@/app/featureManifest`): `id`, `page` (`name`, `heading` = the page's h1, `list`/`detail` loaders written `() => import('./pages').then((m) => m.XPage)`, optional any-of `permission`), `registry` (Refine CRUD resources from `api/resources.ts`), `palette` sources (type `PaletteSource` from `@/app/palette`), `useNavCounts` (dashboard only). See `src/features/orders/manifest.ts`.
- `pages/index.ts` exports the page components only (lazy chunk); `index.ts` exports what other features may use.
- Dev mocks live in `src/features/<name>/mocks/`: `mocks/index.ts` exports `mocks: FeatureMocks` (`@/mocks/featureMocks`: `handlers`, `reset`). Use the shared helpers from `@/mocks/*`: `guard` (session + CSRF), `latency`, `problem` (problem+json), `crudHandlers` + `Collection` (`@/mocks/crud`, `@/mocks/db`), `loadDemoState` (`@/mocks/seed`, the demo's seed), and existing stores (`@/mocks/orders`, `@/mocks/ledger`, `@/mocks/staff`, `@/mocks/settings`). Map demo objects to the API's DTOs. Most specific routes first. `reset` restores your stores (tests call it after each test). Feature code never imports its own mocks (lint enforces it); tests may.
- Tests sit next to the code; page-test helpers go in `src/features/<name>/test/`. Shared helpers: `@/test/renderApp` (`setupMockApi`, `renderApp`, `signInAs`, `mockMe`).

## Code rules you are checked on
- One exported function per endpoint in `api/`, typed request/response, JSDoc (what + why) and `@route METHOD /path` with the exact slice path. HTTP only through `@/lib/api` (native fetch client). Components never call `api/` directly: api → hooks (`useApiQuery`/`useApiMutation` from `@/lib/query`, or Refine hooks through the registry) → components.
- Components ≤ ~200 lines, pages only compose. Every file starts with 1–3 comment lines (what it is, which demo page or route it ports); every non-trivial function, hook, component and type has a short what/why comment. Simple English.
- Follow the demo's markup, Tailwind classes and copy, using the kit in `@/components/ui` (look at its `index.ts`). Keep URL state for tabs, filters, page and sort like orders (`usePageClamp` from the kit).
- The server is the authority: no business rules on the client beyond UX hints; always show the server's problem+json message (field errors under fields: `dialogSubmit`, `applyServerErrors`). Money arrives as 4-decimal strings: format with `@/lib/format`, never do float maths that decides anything.
- Hide or disable actions the staff member lacks permission for (hint only, the title names the missing permission); the page permission is checked by the app.
- Assumed contracts (bodies and fields the map does not give) are marked "Assumed contract" in JSDoc and listed in HANDOFF.md.

## HANDOFF.md (`src/features/<name>/HANDOFF.md`)
Sections: `## Mismatches` (rows in the format of docs/MISMATCHES.md, numbered `<NAME>-1`, `<NAME>-2`…), `## Assumed contracts`, `## SHARED-NEEDS`, `## Deep links` (addresses you link to or honour), `## Backend questions`. The lead moves it into docs/ and deletes it.

## Checks (from the worktree; never run the whole suite with default workers, the machine is shared)
- While working: `npm run typecheck`, `npx eslint src/features/<name>`, `npx vitest run src/features/<name> --maxWorkers=2`.
- Before replying: `npm run lint && npm run build && npx vitest run --maxWorkers=3` and `node scripts/check-route-coverage.mjs --feature <name>` (all routes of your slice). All green. If one stays red after two honest fix attempts, stop and report the exact error.

## Reply (≤ 200 words)
Files (summary), routes covered n/n, assumed contracts beyond the brief, mismatch rows written, SHARED-NEEDS, decisions to review, anything not done.
