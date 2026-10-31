// Dev mock scenarios: `?mock=<name>` on any address picks how the mock API behaves (System health: healthy, degraded,
// outage…; `readonly` also signs the staff member in with read-only permissions). The choice is kept for the browser
// tab, so in-app navigation keeps it. Mock layer only (decision 014): never part of a production build.

/** Every scenario, in the order the switcher lists them. */
export const MOCK_SCENARIOS = [
  'healthy',
  'degraded',
  'outage',
  'monitoring-down',
  'partial-failure',
  'maintenance',
  'readonly',
] as const;

export type MockScenario = (typeof MOCK_SCENARIOS)[number];

/** One line per scenario, shown by the switcher. */
export const SCENARIO_NOTES: Readonly<Record<MockScenario, string>> = {
  healthy: 'Everything up',
  degraded: 'Slow supplier, critical alert, open incident',
  outage: 'Database down, 5xx spike',
  'monitoring-down': 'Metrics backend unreachable',
  'partial-failure': 'Only the queues endpoint fails',
  maintenance: 'Checkout maintenance, ledger mismatch',
  readonly: 'Degraded data, read-only staff member',
};

const STORAGE_KEY = 'gsm-mock-scenario';
const DEFAULT_SCENARIO: MockScenario = 'healthy';

let current: MockScenario | undefined;

function isScenario(value: unknown): value is MockScenario {
  return typeof value === 'string' && (MOCK_SCENARIOS as readonly string[]).includes(value);
}

// sessionStorage can be missing or blocked (a bare Node run, private mode): the scenario then lasts for this load.
function readStored(): string | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(value: MockScenario | null): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (value) sessionStorage.setItem(STORAGE_KEY, value);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // blocked storage: nothing to keep
  }
}

function readUrl(): string | null {
  try {
    return typeof window === 'undefined' ? null : new URL(window.location.href).searchParams.get('mock');
  } catch {
    return null;
  }
}

/**
 * The scenario in effect: the `?mock=` of the address the app was loaded with, else the one kept for this tab, else
 * healthy. Read once per page load; handlers call it on every request.
 */
export function mockScenario(): MockScenario {
  if (current) return current;
  const fromUrl = readUrl();
  const stored = readStored();
  current = isScenario(fromUrl) ? fromUrl : isScenario(stored) ? stored : DEFAULT_SCENARIO;
  writeStored(current);
  return current;
}

/** Picks a scenario now (tests, and the switcher just before it reloads the page). */
export function setMockScenario(next: MockScenario): void {
  current = next;
  writeStored(next);
}

/** Back to the default scenario; `resetMockState` calls it after each test. */
export function resetMockScenario(): void {
  current = undefined;
  writeStored(null);
}
