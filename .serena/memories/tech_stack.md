# Tech stack
- React 19.1, TypeScript 5.9 strict, Vite 7 (+ @vitejs/plugin-react 5), npm (package-lock).
- @refinedev/core 5 headless, @refinedev/react-router 2 + react-router 7 (BrowserRouter), @refinedev/react-hook-form 5 + react-hook-form 7, @tanstack/react-query 5 (direct dep, shares Refine's QueryClient).
- Tailwind 3.4 + PostCSS (demo config reused; not v4 on purpose), @fontsource IBM Plex Sans/Mono.
- Native fetch only (no axios/ky). No UI kit, no chart lib, no date lib, no zod, no client-state lib.
- Tests: Vitest 4 + jsdom + Testing Library + MSW 2 (node). Dev mocks: MSW 2 browser worker behind `VITE_API_MOCKS=true`.
- Lint: ESLint 9 flat (typescript-eslint, react-hooks, react-refresh, prettier) + Prettier 3.
- Refine v5 shapes: data hooks return `{ result, query }`; `useTable` returns `tableQuery`, `currentPage`, `setCurrentPage`; authProvider methods resolve `{ success, redirectTo, error }` / `{ authenticated, redirectTo, logout }`.
