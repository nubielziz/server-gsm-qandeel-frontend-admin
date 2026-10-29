# 001 Build tool, app shell, package manager

**Context.** The repo holds a create-refine-app scaffold (Refine CLI, devtools, kbar, nestjs-query GraphQL provider, Tailwind 4, sample blog pages). The target is a fetch-only REST admin console. Node 26 is installed.

**Options.** (a) Keep the scaffold as is. (b) Vite + React + `@refinedev/core` headless, plain Vite scripts. (c) Next.js / Remix framework mode.

**Decision.** (b). Versions: React 19.1, `@refinedev/core` 5, Vite 7 + `@vitejs/plugin-react` 5, TypeScript 5.9 (strict). Package manager: **npm** with a committed `package-lock.json` (the Dockerfile already supports `npm ci`; no pnpm-only settings). Remove `@refinedev/cli`, `@refinedev/devtools`, `@refinedev/kbar`, `@refinedev/nestjs-query`, `graphql*`, `@graphql-codegen/*`, the stale `@typescript-eslint/*` v5 packages and the sample pages. Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `test`, `gen:types`, `routes:manifest`, `routes:coverage`.

**Why not the others.** The CLI and devtools add a dev server wrapper and telemetry we do not need; kbar brings its own look (the demo has its own palette, ported instead). Vite 8 / TS 6–7 are newer than parts of the toolchain support (typescript-eslint needs TS < 6.1, `@vitejs/plugin-react` 6 needs Vite 8); we take the newest mature line of each. ESLint 10 is used because 9 is out of support. Docker image: Node 24 build + nginx with an `index.html` fallback. A framework mode adds SSR we do not need for an authenticated console.

**Consequences.** One small, standard toolchain. Upgrades (Vite 8, TS 6) are later, isolated changes.
