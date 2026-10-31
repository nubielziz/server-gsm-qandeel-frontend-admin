// Tests for the alerts and incidents card, the build card, the read-only view and the "no data is never green" rule of the
// Overview tab, run through the whole app against the dev mock API.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupHealthMocks } from '../../mocks/testing';
import { serveHealth, systemHealth } from '../../test/healthFixture';
import { openHealthPage } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';
import type { HealthComponent, Measure } from '../../types';
import { card, componentsTable } from './overviewKit';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('open alerts and incidents', () => {
  it('lists the open alerts, worst first, and the ongoing incident, each linking into the Alerts tab', async () => {
    await openHealthPage({ scenario: 'degraded' });
    const alerts = await card('Open alerts and incidents');
    expect(await within(alerts).findAllByText('Supplier timeouts', undefined, SLOW)).toHaveLength(2);
    const [alertLink, incidentLink] = within(alerts).getAllByRole('link', { name: 'Supplier timeouts' });
    expect(alertLink).toHaveAttribute('href', '/system-health?tab=alerts');
    expect(incidentLink).toHaveAttribute('href', '/system-health?tab=alerts&view=incidents&incident=5');
    expect(within(alerts).getByRole('link', { name: 'Oldest queued job' })).toHaveAttribute(
      'href',
      '/system-health?tab=alerts',
    );
    // Severity and status are words with icons, the subject and the components are named, and every start is shown.
    expect(within(alerts).getByText('Critical')).toBeInTheDocument();
    expect(within(alerts).getByText('Warning')).toBeInTheDocument();
    expect(within(alerts).getByText('Major')).toBeInTheDocument();
    expect(within(alerts).getByText('Identified')).toBeInTheDocument();
    expect(within(alerts).getByText('orders.dispatch')).toBeInTheDocument();
    expect(within(alerts).getAllByText('Rapid IMEI')).toHaveLength(2);
    expect(within(alerts).getAllByText(/^Started/)).toHaveLength(3);
    // The critical alert comes before the warning one.
    const rules = within(alerts)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(rules).toEqual(['Supplier timeouts', 'Oldest queued job', 'Supplier timeouts']);
  });

  it('puts every severity badge in a slot of one width and tells the subject, the start and the age apart with " · "', async () => {
    await openHealthPage({ scenario: 'degraded' });
    const alerts = await card('Open alerts and incidents');
    expect(await within(alerts).findAllByText('Supplier timeouts', undefined, SLOW)).toHaveLength(2);
    const items = within(alerts).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    // Critical, Warning and Major are different widths; the slot is the same, so the three titles start at one place.
    const slots = items.map((item) => item.firstElementChild!);
    expect(slots.map((slot) => slot.className)).toEqual(Array(3).fill('min-w-20 flex-none'));
    expect(items[0]!.textContent).toMatch(/Rapid IMEI\s·\sStarted \d/);
    expect(items[1]!.textContent).toMatch(/orders\.dispatch\s·\sStarted \d/);
    // The status badge leads the second line of an incident; the components, the start and the age follow, joined.
    expect(items[2]!.textContent).toMatch(/Identified.*Rapid IMEI\s·\sStarted \d.* · \d+m ago/);
  });

  it('keeps the range of the page in the links into the Alerts tab, and leaves the default out', async () => {
    await openHealthPage({ scenario: 'degraded', route: '/system-health?range=7d' });
    const alerts = await card('Open alerts and incidents');
    expect(await within(alerts).findAllByText('Supplier timeouts', undefined, SLOW)).toHaveLength(2);
    const [alertLink, incidentLink] = within(alerts).getAllByRole('link', { name: 'Supplier timeouts' });
    expect(alertLink).toHaveAttribute('href', '/system-health?tab=alerts&range=7d');
    expect(incidentLink).toHaveAttribute(
      'href',
      '/system-health?tab=alerts&view=incidents&incident=5&range=7d',
    );
  });

  it('says in one quiet line that nothing is open when nothing is', async () => {
    await openHealthPage();
    const alerts = await card('Open alerts and incidents');
    expect(await within(alerts).findByText('No open alerts', undefined, SLOW)).toBeInTheDocument();
    expect(within(alerts).getByText('No ongoing incidents')).toBeInTheDocument();
    expect(within(alerts).queryAllByRole('link')).toHaveLength(0);
  });

  it('marks an acknowledged alert as acknowledged and leaves "Firing" off the rest', async () => {
    await openHealthPage({ scenario: 'maintenance' });
    const alerts = await card('Open alerts and incidents');
    expect(await within(alerts).findByText('Ledger mismatch', undefined, SLOW)).toBeInTheDocument();
    expect(within(alerts).getByText('Acknowledged')).toBeInTheDocument();
    expect(within(alerts).getByText('Wallet · Basra Unlock Center')).toBeInTheDocument();
    expect(within(alerts).queryByText('Firing')).not.toBeInTheDocument();
  });

  it('is neutral "No data", never the reassuring "No open alerts", when the alert rules cannot be evaluated', async () => {
    await openHealthPage({ scenario: 'monitoring-down' });
    const alerts = await card('Open alerts and incidents');
    expect(await within(alerts).findByText('No data.', undefined, SLOW)).toBeInTheDocument();
    expect(within(alerts).getByText(/does not mean nothing is open/)).toBeInTheDocument();
    expect(within(alerts).queryByText('No open alerts')).not.toBeInTheDocument();
    expect(alerts.querySelector('.b-good')).toBeNull();
  });

  it('lists the alerts the summary counts but does not list, and links the rest', async () => {
    mockServer.use(
      serveHealth(() =>
        systemHealth({
          alerts: {
            open: { value: 5, unit: 'count', state: 'crit', warn: 1 },
            critical: 2,
            items: [
              {
                id: 1,
                ruleName: 'Disk almost full',
                severity: 'critical',
                status: 'firing',
                subjectLabel: null,
                startedAt: null,
              },
            ],
            trend: [],
          },
        }),
      ),
    );
    await openHealthPage();
    const alerts = await card('Open alerts and incidents');
    expect(await within(alerts).findByText('Disk almost full', undefined, SLOW)).toBeInTheDocument();
    expect(within(alerts).getByRole('link', { name: '+4 more' })).toHaveAttribute(
      'href',
      '/system-health?tab=alerts',
    );
    // A start the server left out is neutral text, not "Invalid Date".
    expect(within(alerts).getByText('Start time unknown')).toBeInTheDocument();
  });

  it('leaves out the links a role cannot follow: none without alerts:read and incidents:read', async () => {
    await openHealthPage({ scenario: 'degraded', permissions: ['system:read'] });
    const alerts = await card('Open alerts and incidents');
    expect(await within(alerts).findAllByText('Supplier timeouts', undefined, SLOW)).toHaveLength(2);
    expect(within(alerts).queryAllByRole('link')).toHaveLength(0);
    // The supplier page needs suppliers:read, so the kind is plain text.
    const { table } = await componentsTable();
    expect(within(table).queryByRole('link')).not.toBeInTheDocument();
    expect(within(table).getByText('Supplier')).toBeInTheDocument();
  });

  it('links alerts with alerts:read alone, and incidents with incidents:read alone', async () => {
    await openHealthPage({ scenario: 'degraded', permissions: ['system:read', 'alerts:read'] });
    const alerts = await card('Open alerts and incidents');
    expect(await within(alerts).findAllByText('Supplier timeouts', undefined, SLOW)).toHaveLength(2);
    expect(
      within(alerts)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/system-health?tab=alerts', '/system-health?tab=alerts']);
  });
});

describe('the build', () => {
  it('shows the version, the commit in mono with a copy button, the environment and when it was deployed', async () => {
    const user = userEvent.setup();
    await openHealthPage();
    const build = await card('Build');
    expect(await within(build).findByText('v1.42.0', undefined, SLOW)).toBeInTheDocument();
    expect(within(build).getByText('9c4e1fa')).toHaveClass('mono');
    expect(within(build).getByText('production')).toBeInTheDocument();
    expect(within(build).getByText('Deployed')).toBeInTheDocument();
    expect(within(build).getByText(/ago$/)).toBeInTheDocument();
    await user.click(within(build).getByRole('button', { name: 'Copy commit' }));
    expect(await navigator.clipboard.readText()).toBe('9c4e1fa');
  });

  it('has no Grafana link of its own, even when the address is set: the page header carries it', async () => {
    vi.stubEnv('VITE_GRAFANA_URL', 'https://grafana.example.com/d/gsm');
    await openHealthPage();
    const build = await card('Build');
    await within(build).findByText('v1.42.0', undefined, SLOW);
    expect(within(build).queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('a read-only staff member', () => {
  it('sees the same data and no action button, and the tab never offers one', async () => {
    await openHealthPage({ scenario: 'readonly' });
    const { table } = await componentsTable();
    expect(within(table).getByRole('button', { name: 'Rapid IMEI' })).toBeInTheDocument();
    const alerts = await card('Open alerts and incidents');
    expect(await within(alerts).findAllByText('Supplier timeouts', undefined, SLOW)).toHaveLength(2);
    // The read-only role may read alerts, incidents and suppliers, so the links are there.
    expect(within(alerts).getAllByRole('link')).toHaveLength(3);
    const panel = screen.getByRole('tabpanel', { name: 'Overview' });
    const buttons = within(panel)
      .getAllByRole('button')
      .map((button) => button.textContent ?? '');
    for (const action of [/Pause/, /Resume/, /Acknowledge/, /Declare/, /Delete/, /Run/, /Maintenance/]) {
      expect(buttons.some((text) => action.test(text))).toBe(false);
    }
    expect(panel.querySelector('button[title^="You need"]')).toBeNull();
  });
});

describe('no data is never green', () => {
  const noValue: Measure = { value: null, unit: 'ms', state: 'unknown' };
  const noUptime: Measure = { value: null, unit: 'percent', state: 'unknown' };
  const silent: HealthComponent = {
    key: 'supplier:9',
    name: 'Silent Supplier',
    kind: 'supplier',
    status: 'unknown',
    since: null,
    latency: noValue,
    uptime: { h24: noUptime, d7: noUptime, d30: noUptime },
    lastCheckedAt: null,
    detail: 'Supplier is disabled; its checks are off.',
    supplierId: 9,
    gatewayId: null,
  };

  it('shows a component with no check as Unknown in neutral, with "No data" for every figure, among the problems', async () => {
    // Nothing was checked: every bucket is `unknown` and has no response time.
    const holes = [0, 1, 2].map((hour) => ({
      start: new Date(Date.UTC(2026, 9, 31, hour)).toISOString(),
      status: 'unknown' as const,
      checks: 0,
      failures: 0,
      latencyMs: null,
    }));
    mockServer.use(
      serveHealth(() =>
        systemHealth({
          status: 'unknown',
          monitoring: { status: 'unavailable', detail: 'Prometheus did not answer.', lastScrapeAt: null },
          components: [silent],
          alerts: {
            open: { value: null, unit: 'count', state: 'unknown' },
            critical: 0,
            items: [],
            trend: [],
          },
        }),
      ),
      http.get('*/admin/system/checks', () =>
        HttpResponse.json({
          range: '24h',
          bucketSeconds: 1800,
          components: [
            {
              key: 'supplier:9',
              name: 'Silent Supplier',
              uptime: noUptime,
              latency: noValue,
              buckets: holes,
            },
          ],
        }),
      ),
    );
    await openHealthPage();
    const { components, table } = await componentsTable();
    const row = within(table).getAllByRole('row')[1]!;
    expect(within(row).getByText('Unknown')).toBeInTheDocument();
    // Latency, three uptime windows and the "since": five times "No data", all in the muted ink.
    expect(within(row).getAllByText('No data').length).toBeGreaterThanOrEqual(5);
    expect(within(row).getByText('Supplier is disabled; its checks are off.')).toBeInTheDocument();
    // The bars say that no check ran, in words, and are outlines, not green cells.
    const bars = await within(row).findByRole(
      'img',
      { name: /^Silent Supplier checks, last 24 hours: 3 with no data$/ },
      SLOW,
    );
    expect(bars.querySelector('.bg-good-dot')).toBeNull();
    expect(components.querySelector('.b-good')).toBeNull();
    expect(components.querySelector('.text-good-fg')).toBeNull();
    // No other component is healthy, so there is no quiet "operational" line either.
    expect(within(components).queryByText(/operational/)).not.toBeInTheDocument();
    // The chart has no response time to draw, so it says "No data" rather than an empty plot.
    const chart = await card('Response time · Silent Supplier · last 24 hours');
    expect(await within(chart).findByText('No data', undefined, SLOW)).toBeInTheDocument();
  });

  it('shows no green anywhere on the tab while monitoring is down and there is nothing to show but the quiet line', async () => {
    await openHealthPage({ scenario: 'monitoring-down' });
    const alerts = await card('Open alerts and incidents');
    await within(alerts).findByText('No data.', undefined, SLOW);
    const panel = screen.getByRole('tabpanel', { name: 'Overview' });
    // Folded, the healthy components are plain muted text, not a green banner or badge.
    const line = await within(panel).findByText('14 components operational', undefined, SLOW);
    expect(line.closest('p')).toHaveClass('text-ink3');
    expect(panel.querySelector('.b-good')).toBeNull();
  });
});
