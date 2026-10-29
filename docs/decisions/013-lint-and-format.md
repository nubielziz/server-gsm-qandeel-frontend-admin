# 013 Lint and format

**Decision.** ESLint 9 flat config: `@eslint/js` recommended, `typescript-eslint` recommended (type-aware rules not enabled, to keep lint fast), `eslint-plugin-react-hooks` recommended, `eslint-plugin-react-refresh`, `eslint-config-prettier` last. Extra rules: no `axios`/`ky`/`node-fetch` imports and no `fetch(` outside `src/lib/api` (`no-restricted-imports` / `no-restricted-syntax`); no deep imports into another feature (`@/features/*/*`). Prettier 3 (printWidth 110, single quotes, trailing commas) formats everything; `npm run lint` = `eslint .` + `prettier --check .`; `npm run format` fixes. Ignored: `reference/`, `dist/`, `coverage/`, generated JSON.

**Consequences.** The fetch-only and feature-boundary rules are enforced by the linter, not by memory.
