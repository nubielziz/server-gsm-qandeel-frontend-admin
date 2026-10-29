# 014 Dev mock layer

**Context.** The server does not exist yet. Without data every page shows only its error state, so screens cannot be compared with the demo or exercised. The demo builds its data with a seeded generator (`seed()` in `10-data.js`, `seedB2C()` in `09-b2c-data.js`, `mulberry32`, times relative to `Date.now()`).

**Options.** (a) No mocks. (b) MSW in the browser, behind one env flag, seeded from the demo. (c) A hand-written fetch wrapper.

**Decision.** (b), MSW 2.
- Flag: `VITE_API_MOCKS=true` with `npm run dev`. `main.tsx` starts the worker only when `import.meta.env.DEV && import.meta.env.VITE_API_MOCKS === "true"` (dead code in production builds). `vite.config.ts` serves `mockServiceWorker.js` from `src/mocks/` in dev only, so nothing lands in `public/` or `dist/`, and refuses a production build with the flag on.
- Folder: everything in `src/mocks/` (worker setup, `crud.ts` generic simple-rest handlers, `problem.ts`, `session.ts` for login/2FA/CSRF, `handlers/<feature>.ts`, `seed/`). Deleting the folder and the guarded import removes the layer.
- Seed: `scripts/extract-demo-seed.mjs` runs the demo's own data files in a Node `vm` and writes `src/mocks/seed/demo-state.json` (times stored relative to capture, rebased at load). Feature handlers map demo objects to API DTOs.
- Mocks fake responses and simple state changes only; they never become a second implementation of server rules.

**Consequences.** Every page can be run and compared with the demo before the server exists; the same handlers back API tests. Phase 4 checks that `dist/` contains no MSW or seed code.
