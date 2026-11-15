// Starts the MSW service worker for `npm run dev` with VITE_API_MOCKS=true (all routes mocked) or `unbuilt` (only the
// routes the real backend has not built yet). Load it with a dynamic import from main.tsx so production bundles never
// contain it.
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { isUnbuiltMode, withLivePassthrough } from './live';
import { LIVE_ROUTE_KEYS } from './liveRoutes.gen';
import { mountScenarioSwitcher } from './scenarioSwitcher';
import { installMockEventSource } from './stream';

/**
 * Registers the worker (served at /mockServiceWorker.js by the dev server) and resolves when it is ready, then shows
 * the scenario switcher (`?mock=`). In unbuilt mode the live routes get passthrough handlers placed before every mock
 * (first match wins), so they reach the real API through the dev proxy and the mocks answer the rest. With every route mocked, the live stream is
 * mocked too (`stream.ts`); in unbuilt mode the real backend serves it through the same proxy.
 */
export async function startMockWorker(): Promise<void> {
  const unbuilt = isUnbuiltMode();
  if (!unbuilt) installMockEventSource();
  const worker = setupWorker(...(unbuilt ? withLivePassthrough(handlers) : handlers));
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' },
    // Fonts, Vite's own requests and anything else we do not mock go through untouched.
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
  if (unbuilt)
    console.info(`Mock API: ${LIVE_ROUTE_KEYS.length} built routes go to the real API; the rest is mocked.`);
  mountScenarioSwitcher();
}
