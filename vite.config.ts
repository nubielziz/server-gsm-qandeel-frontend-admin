/// <reference types="vitest/config" />
// Vite config: React, the `@/` alias, an optional dev proxy to a real API, the dev-only mock worker
// and the Vitest settings.
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const MOCK_WORKER_FILE = fileURLToPath(new URL('./src/mocks/worker/mockServiceWorker.js', import.meta.url));

// Serves the MSW worker script straight from src/mocks/worker, in `vite dev` only and only with VITE_API_MOCKS=true,
// so the file never lands in public/ or dist/ (decision 014).
function serveMockWorker(): Plugin {
  return {
    name: 'gsm-serve-mock-worker',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/mockServiceWorker.js', (_request, response) => {
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(readFileSync(MOCK_WORKER_FILE));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // The mock layer is dev-only (decision 014): refuse to bake it into a production bundle.
  if (mode === 'production' && env.VITE_API_MOCKS === 'true') {
    throw new Error('VITE_API_MOCKS=true is not allowed in a production build.');
  }

  // Optional: proxy /admin and /health to a real server so the browser sees one origin in dev.
  const proxyTarget = env.VITE_DEV_PROXY_TARGET;
  const proxy = proxyTarget
    ? Object.fromEntries(['/admin', '/health'].map((p) => [p, { target: proxyTarget, changeOrigin: true }]))
    : undefined;

  return {
    plugins: [react(), ...(env.VITE_API_MOCKS === 'true' ? [serveMockWorker()] : [])],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { proxy },
    test: {
      environment: 'jsdom',
      // Node 25+ ships its own `localStorage`, which warns and does not work without --localstorage-file, and it
      // hides jsdom's working one. Turning it off lets tests (and MSW's cookie store) use jsdom's Storage.
      execArgv: ['--no-experimental-webstorage'],
      // Refine's router bindings must load through Vite like our own code. Left to Node they get their own copy of
      // react-router, whose router context our <MemoryRouter> never fills ('useLocation() may be used only in a <Router>').
      server: { deps: { inline: ['@refinedev/react-router'] } },
      setupFiles: ['./src/test/setup.ts'],
      // Many tests render the whole app against the mock API. With every file running in parallel, a few of them pass
      // the default 5 s on a busy machine, so a test may take 15 s before it counts as hung.
      testTimeout: 15_000,
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
      css: false,
      passWithNoTests: true,
    },
  };
});
