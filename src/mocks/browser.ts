// Starts the MSW service worker for `npm run dev` with VITE_API_MOCKS=true. Load it with a dynamic import
// from main.tsx so production bundles never contain it.
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { mountScenarioSwitcher } from './scenarioSwitcher';

/**
 * Registers the worker (served at /mockServiceWorker.js by the dev server) and resolves when it is ready, then shows
 * the scenario switcher (`?mock=`).
 */
export async function startMockWorker(): Promise<void> {
  const worker = setupWorker(...handlers);
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' },
    // Fonts, Vite's own requests and anything else we do not mock go through untouched.
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
  mountScenarioSwitcher();
}
