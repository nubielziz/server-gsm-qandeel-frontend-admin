// The dev-only scenario switcher: a small panel in the bottom corner of the page that reloads the app with another
// `?mock=` scenario. Plain DOM, mounted by the mock worker (browser.ts), so the app's own code never knows about it.
// Add `?mockui=off` to the address to hide it (screenshots).
import { MOCK_SCENARIOS, SCENARIO_NOTES, mockScenario, setMockScenario, type MockScenario } from './scenario';

const PANEL_ID = 'gsm-mock-scenario-switcher';

/** Mounts the switcher once, unless the address asks for no mock UI. */
export function mountScenarioSwitcher(): void {
  if (typeof document === 'undefined' || document.getElementById(PANEL_ID)) return;
  if (new URL(window.location.href).searchParams.get('mockui') === 'off') return;

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Mock API scenario (development only)');
  Object.assign(panel.style, {
    position: 'fixed',
    insetInlineStart: '8px',
    insetBlockEnd: '8px',
    zIndex: '80',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 6px',
    font: '500 11px/16px "IBM Plex Sans", system-ui, sans-serif',
    color: 'rgb(var(--ink2))',
    background: 'rgb(var(--surface))',
    border: '1px solid rgb(var(--line2))',
    borderRadius: '6px',
    boxShadow: '0 12px 32px -8px rgb(0 0 0 / .22)',
  });

  const label = document.createElement('label');
  label.htmlFor = `${PANEL_ID}-select`;
  label.textContent = 'Mock';

  const select = document.createElement('select');
  select.id = `${PANEL_ID}-select`;
  Object.assign(select.style, { font: 'inherit', color: 'rgb(var(--ink))', background: 'transparent' });
  for (const name of MOCK_SCENARIOS) {
    const option = document.createElement('option');
    option.value = name;
    // textContent, not innerHTML: the names are ours, but the panel never parses markup.
    option.textContent = `${name} · ${SCENARIO_NOTES[name]}`;
    select.append(option);
  }
  select.value = mockScenario();
  select.addEventListener('change', () => {
    const next = select.value as MockScenario;
    setMockScenario(next);
    // Reload so every cached query and the signed-in permissions start from the new scenario.
    const url = new URL(window.location.href);
    url.searchParams.set('mock', next);
    window.location.assign(url.toString());
  });

  panel.append(label, select);
  document.body.append(panel);
}
