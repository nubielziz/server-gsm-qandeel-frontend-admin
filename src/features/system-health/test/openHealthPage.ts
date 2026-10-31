// Page-test helpers for System health: open the page inside the whole app, as a staff member with chosen permissions, in
// a chosen mock scenario. Tests call `setupHealthMocks()` (../mocks/testing) once at the top of the file.
import { screen } from '@testing-library/react';
import { setMockScenario, type MockScenario } from '@/mocks/scenario';
import { mockMe, renderApp } from '@/test/renderApp';

export interface OpenHealthOptions {
  /** The mock scenario (`healthy`, `degraded`, `outage`…). Default: healthy. */
  scenario?: MockScenario;
  /** What `me` says the staff member may do. Default: the signed-in owner (`*`). */
  permissions?: string[];
  /** The address to open. Default: the bare page. */
  route?: string;
}

/**
 * Renders the app at the page and waits for its heading. The first test of a file also waits for the lazy page chunk, so
 * the wait is generous.
 */
export async function openHealthPage({
  scenario,
  permissions,
  route = '/system-health',
}: OpenHealthOptions = {}) {
  if (scenario) setMockScenario(scenario);
  if (permissions) mockMe({ permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'System health' }, { timeout: 10_000 });
  return app;
}
