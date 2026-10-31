# GSM admin console

The admin console of GSM Supply, built with [Refine](https://refine.dev) (headless), React 19, TypeScript (strict),
Tailwind 3 and React Query 5. It ports the static demo in `reference/gsm-admin` (screens, copy, interactions) and is
typed against the API design in `reference/gsm-map` (routes, entities, permissions, error codes). All 16 pages of the
demo are built, plus System health (no demo page: `docs/system-health-design.md`), and every one of the map's 268
admin endpoints plus `GET /health` has a typed client function (`docs/ROUTE_COVERAGE.md`).

## Quick start

```bash
npm install
cp .env.example .env.local      # then edit it, see below
npm run dev                     # http://localhost:5173
```

Node 24 or newer.

### Against the real API

The NestJS backend (`../backend`) listens on port 3000. In development, the simplest way is to let Vite proxy the API,
so the browser sees one origin, the session cookie and the CSRF cookie work, and no CORS setup is needed:

```dotenv
VITE_API_BASE_URL=
VITE_DEV_PROXY_TARGET=http://localhost:3000
VITE_API_MOCKS=false
```

For a deployed build, set `VITE_API_BASE_URL` to the API's address (for example `https://api.example.com`) at build
time. `VITE_CSRF_COOKIE` names the readable cookie that carries the CSRF token (default `csrf_token`; the
`X-CSRF-Token` response header is the fallback), and `VITE_STOREFRONT_URL` is used for "Open the storefront" links.

Admin sign-in uses an httpOnly session cookie, the CSRF token on every mutation, and mandatory two-factor
authentication (decision 006). Where the map gives no request or response body, the console assumes one; every
assumption is listed in `docs/ASSUMED_CONTRACTS.md`, with the questions for the backend team.

### With the dev mock API (no backend)

```dotenv
VITE_API_MOCKS=true
```

`npm run dev` then starts an MSW service worker seeded with the demo's own data (`src/mocks/seed/demo-state.json`).
Sign in with any seeded staff email (the owner is `rami@gsm-supply.example`), the password `demo-password` and the
code `123456`. The mock layer is dev-only: a production build refuses `VITE_API_MOCKS=true`, and no mock code reaches
`dist`.

Mock scenarios: add `?mock=<name>` to any address to choose how the mock API behaves; the choice is kept for the
browser tab, and a small switcher in the bottom corner (dev mock layer only; hide it with `?mockui=off`) reloads the
app with another one. They mostly drive System health:

| `?mock=` | What the mock API does |
|---|---|
| `healthy` (default) | Everything up. |
| `degraded` | A slow supplier, a critical alert firing, an open incident, orders past SLA. |
| `outage` | Database down, a 5xx spike; order and integrity reads fail. |
| `monitoring-down` | The metrics backend does not answer: metrics and errors return 503, the verdict is neutral. |
| `partial-failure` | Only `GET /admin/system/queues` fails; every other card keeps working. |
| `maintenance` | Checkout maintenance on, a ledger mismatch alert and a failed integrity check. |
| `readonly` | Degraded data, and whoever signs in gets the read-only role (no action buttons). |

### System health links

The System health page links to the monitoring tools only when their address is set at build time; unset means no
link, never a dead one:

```dotenv
VITE_GRAFANA_URL=https://grafana.example.com/d/gsm-api     # "Open in Grafana" (header and API tab)
VITE_SENTRY_URL=https://sentry.example.com/organizations/gsm/issues/   # Sentry links of the top errors
VITE_BULL_BOARD_URL=https://api.example.com/admin/queues   # "Open in Bull Board"; a queue opens at <url>/queue/<name>
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (Vite). |
| `npm run build` | Typecheck, then a production build in `dist/`. |
| `npm run preview` | Serves `dist/` locally. |
| `npm run typecheck` / `npm run lint` | TypeScript strict; ESLint 10 + Prettier check (with the project's guard rails). |
| `npm test` | Vitest + Testing Library against the mock API (about 3,000 tests). |
| `npm run routes:coverage` | Rewrites `docs/ROUTE_COVERAGE.md`; `-- --strict` fails below 100% or on a bad `@route` tag; `-- --feature <name>` checks one feature without writing. |
| `npm run routes:manifest` / `routes:slices` | Rebuild the route manifest from the map, and the per-feature slices in `docs/slices/`. |
| `npm run gen:types` | Regenerate entity types from the map (`src/lib/api/schema.gen.ts`). |
| `npm run feature:worktree -- add\|remove <name>` | Worktree on `feat/<name>` for building a feature in parallel. |

A change is done when `npm run typecheck && npm run lint && npm run build && npm test` are green.

## How the code is laid out

- `src/app`: providers, routes, page resources, the shell (sidebar, top bar, command palette) and the gates.
- `src/lib/api`: the only `fetch` caller, problem+json errors, list queries, the CSRF header, and the data-provider registry.
- `src/lib/format`, `src/lib/query`, `src/lib/auth`: formatting (money stays a 4-decimal string), query helpers, permission checks.
- `src/components/ui`, `src/components/charts`: the shared kit, in the demo's design tokens.
- `src/features/<name>`: one folder per page: `api/` (one function per endpoint with `@route`), `types/`, `hooks/`,
  `components/`, `pages/`, `mocks/`, tests, `index.ts` (what other features may use) and `manifest.ts`.
- `src/mocks`: the dev mock layer (shared stores and helpers; each feature's own mocks are found automatically).

The server is the authority for money, risk, validation and permissions: the console hides or disables what a role may
not do as a hint only, and always shows the server's error.

## Adding or changing a feature

1. Read `docs/ARCHITECTURE.md` §5 (the recipe), `CLAUDE.md` (code and comment rules) and the feature's route slice.
2. Write `api/` functions with JSDoc and `@route METHOD /path`, then hooks, components and the page.
3. Plug it in through `src/features/<name>/manifest.ts` (page loaders, heading, permission, registry, palette sources).
   `src/app/features.ts` finds every manifest; no shared file needs editing. Mocks go in `src/features/<name>/mocks/index.ts`.
4. Run the checks and `node scripts/check-route-coverage.mjs --feature <name>`.
5. Log every disagreement between the demo and the map in `docs/MISMATCHES.md`, and every assumed body in
   `docs/ASSUMED_CONTRACTS.md`.

## Documents

- `PROGRESS.md`: status and history of the port.
- `docs/ARCHITECTURE.md` and `docs/decisions/`: architecture and decision records.
- `docs/MISMATCHES.md`: where the demo and the map disagree and which one was followed.
- `docs/ASSUMED_CONTRACTS.md`: request and response shapes the map does not give, and questions for the backend.
- `docs/ROUTE_COVERAGE.md`, `docs/route-manifest.json`, `docs/slices/`: the route list and its coverage.
