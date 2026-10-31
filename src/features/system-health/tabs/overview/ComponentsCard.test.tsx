// Tests for the components card of the Overview tab, run through the whole app against the dev mock API: problems first,
// the healthy ones behind "Show", the check history bars, phone cards, and what each failing read shows.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupHealthMocks } from '../../mocks/testing';
import { serveHealth, systemHealth } from '../../test/healthFixture';
import { openHealthPage } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';
import { recordRequests } from '../../test/recordRequests';
import { card, componentsTable } from './overviewKit';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

afterEach(() => vi.restoreAllMocks());

describe('the components list', () => {
  it('is one quiet line when everything is fine, and Show lists every component and Hide folds them again', async () => {
    const user = userEvent.setup();
    await openHealthPage();
    const components = await card('Components');
    expect(
      await within(components).findByText('14 components operational', undefined, SLOW),
    ).toBeInTheDocument();
    expect(within(components).queryByRole('table')).not.toBeInTheDocument();

    const show = within(components).getByRole('button', { name: /^Show/ });
    expect(show).toHaveAttribute('aria-expanded', 'false');
    await user.click(show);
    const table = within(components).getByRole('table', { name: 'Components' });
    // The header row and the 14 components, each with its own OK badge.
    expect(within(table).getAllByRole('row')).toHaveLength(15);
    expect(within(table).getAllByText('OK')).toHaveLength(14);

    const hide = within(components).getByRole('button', { name: /^Hide/ });
    expect(hide).toHaveAttribute('aria-expanded', 'true');
    await user.click(hide);
    expect(within(components).queryByRole('table')).not.toBeInTheDocument();
  });

  it('lists what is down first, with its failure text, latency, uptime and a link to the supplier, and folds the rest', async () => {
    await openHealthPage({ scenario: 'degraded' });
    const { components, table } = await componentsTable();
    const rows = within(table).getAllByRole('row');
    // The header and one problem row: the 13 healthy components wait behind the quiet line.
    expect(rows).toHaveLength(2);
    const row = rows[1]!;
    expect(within(row).getByText('Down')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Rapid IMEI' })).toBeInTheDocument();
    expect(within(row).getByText('timeout after 6000 ms')).toBeInTheDocument();
    expect(within(row).getByText(/\d+m ago/)).toBeInTheDocument();
    // Units are always shown: seconds for the slow check, percent for the uptime windows.
    expect(within(row).getByText(/ s$/)).toBeInTheDocument();
    expect(within(row).getAllByText(/ %$/)).toHaveLength(3);
    expect(within(row).getByRole('link', { name: 'Open Rapid IMEI on the Suppliers page' })).toHaveAttribute(
      'href',
      '/suppliers?supplier=3',
    );
    expect(within(components).getByText('13 components operational')).toBeInTheDocument();
  });

  it('puts the broken components before the fine ones in the outage, worst first and in the server order', async () => {
    const user = userEvent.setup();
    await openHealthPage({ scenario: 'outage' });
    const { components, table } = await componentsTable();
    const names = () =>
      within(components)
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('button')[0]?.textContent);
    // Postgres is down; the API and the workers are degraded (the server lists the API first).
    expect(names()).toEqual(['Postgres', 'API', 'Queue workers']);
    expect(within(table).getByText('Down')).toBeInTheDocument();
    expect(within(table).getAllByText('Degraded')).toHaveLength(2);
    // After Show the fine ones follow the problems.
    await user.click(within(components).getByRole('button', { name: /^Show/ }));
    expect(names().slice(0, 3)).toEqual(['Postgres', 'API', 'Queue workers']);
    expect(names()).toHaveLength(14);
  });

  it('draws the check history bars of each row with their counts in the name, for the range of the page', async () => {
    await openHealthPage({ scenario: 'degraded', route: '/system-health?range=6h' });
    const { table } = await componentsTable();
    expect(within(table).getByRole('columnheader', { name: 'Last 6 hours' })).toBeInTheDocument();
    const bars = await within(table).findByRole('img', { name: /^Rapid IMEI checks, last 6 hours: / }, SLOW);
    expect(bars.getAttribute('aria-label')).toMatch(/\d+ ok, \d+ down/);
  });

  it('asks for the history of every component over the range, and of one component for the chart', async () => {
    const reads = recordRequests('get', '/admin/system/checks');
    await openHealthPage({ route: '/system-health?range=7d&component=redis' });
    await waitFor(() => expect(reads.length).toBeGreaterThanOrEqual(2), SLOW);
    const asked = reads.map((read) => Object.fromEntries(read.url.searchParams));
    expect(asked).toContainEqual({ range: '7d' });
    expect(asked).toContainEqual({ range: '7d', component: 'redis' });
  });

  it('keeps the rows when the check history fails, says so with the request id, and Retry reads it again', async () => {
    const user = userEvent.setup();
    let failing = true;
    mockServer.use(
      http.get('*/admin/system/checks', () =>
        failing
          ? problem(500, 'INTERNAL_ERROR', 'Something went wrong', 'The check history could not be read.')
          : undefined,
      ),
    );
    await openHealthPage({ scenario: 'degraded' });
    const { components, table } = await componentsTable();
    expect(
      await within(components).findByText('The check history could not be loaded.', undefined, SLOW),
    ).toBeInTheDocument();
    expect(within(components).getByText('The check history could not be read.')).toBeInTheDocument();
    expect(within(components).getByText(/^mock-req-/)).toHaveClass('mono');
    // The row stays, and its bars cell says "No data": never an empty strip that could pass for green.
    const row = within(table).getAllByRole('row')[1]!;
    expect(within(row).getByRole('button', { name: 'Rapid IMEI' })).toBeInTheDocument();
    expect(within(row).getByText('No data')).toBeInTheDocument();
    expect(within(row).queryByRole('img')).not.toBeInTheDocument();
    // The other cards keep working: the alerts come from the health summary.
    const alerts = await card('Open alerts and incidents');
    expect(await within(alerts).findAllByText('Supplier timeouts', undefined, SLOW)).toHaveLength(2);

    failing = false;
    await user.click(within(components).getByRole('button', { name: 'Retry' }));
    expect(await within(table).findByRole('img', { name: /^Rapid IMEI checks/ }, SLOW)).toBeInTheDocument();
    expect(within(components).queryByText('The check history could not be loaded.')).not.toBeInTheDocument();
  });

  it('shows each card its own error with the request id and Retry when the health summary fails, and recovers together', async () => {
    const user = userEvent.setup();
    let failing = true;
    mockServer.use(
      http.get('*/admin/system/health', () =>
        failing
          ? problem(500, 'INTERNAL_ERROR', 'Something went wrong', 'The health check failed.')
          : undefined,
      ),
    );
    await openHealthPage();
    const components = await card('Components');
    expect(
      await within(components).findByText('Could not load the components', undefined, SLOW),
    ).toBeInTheDocument();
    expect(within(components).getByText('The health check failed.')).toBeInTheDocument();
    expect(within(components).getByText(/^mock-req-/)).toBeInTheDocument();
    expect(
      await within(await card('Open alerts and incidents')).findByText('Could not load the open alerts'),
    ).toBeInTheDocument();
    expect(await within(await card('Build')).findByText('Could not load the build')).toBeInTheDocument();
    // With no component in the address, the chart cannot know which one to draw until the summary is back.
    const chart = await card(/^Response time/);
    expect(await within(chart).findByText('Could not load the response time')).toBeInTheDocument();

    failing = false;
    await user.click(within(components).getByRole('button', { name: 'Retry' }));
    expect(
      await within(components).findByText('14 components operational', undefined, SLOW),
    ).toBeInTheDocument();
    expect(await card('Response time · API · last 24 hours')).toBeInTheDocument();
  });

  it('keeps the row of a healthy component the address names while the others are folded, and counts the rest', async () => {
    const user = userEvent.setup();
    await openHealthPage({ route: '/system-health?component=redis' });
    const { components } = await componentsTable();
    const rows = () => within(components).getAllByRole('row');
    // The header and the one row the chart is about; nothing else is a problem.
    expect(rows()).toHaveLength(2);
    expect(within(rows()[1]!).getByRole('button', { name: 'Redis' })).toHaveAttribute('aria-current', 'true');
    expect(within(components).getByText('13 other components operational')).toBeInTheDocument();

    // Show lists every component once, with the plain count; Hide folds them and the picked row stays.
    await user.click(within(components).getByRole('button', { name: /^Show/ }));
    expect(rows()).toHaveLength(15);
    expect(within(components).getByText('14 components operational')).toBeInTheDocument();
    await user.click(within(components).getByRole('button', { name: /^Hide/ }));
    expect(rows()).toHaveLength(2);
    expect(within(components).getByText('13 other components operational')).toBeInTheDocument();
  });

  it('does not keep a row for the default of the chart: a healthy platform stays one quiet line', async () => {
    await openHealthPage({ route: '/system-health?range=6h' });
    const components = await card('Components');
    expect(
      await within(components).findByText('14 components operational', undefined, SLOW),
    ).toBeInTheDocument();
    expect(within(components).queryByRole('table')).not.toBeInTheDocument();
    // The chart still names the component it draws.
    expect(await card('Response time · API · last 6 hours')).toBeInTheDocument();
  });

  it('draws a component list as phone cards with the status in the heading, once, and no sideways table', async () => {
    const matchMedia = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      const base = matchMedia.call(window, query);
      // Only the phone query matches: the shell asks other media queries too.
      return query === '(max-width: 767.98px)'
        ? ({
            ...base,
            matches: true,
            addEventListener: () => {},
            removeEventListener: () => {},
          } as MediaQueryList)
        : base;
    });
    await openHealthPage({ scenario: 'degraded' });
    const components = await card('Components');
    const list = await within(components).findByRole('list', { name: 'Components' }, SLOW);
    expect(within(components).queryByRole('table')).not.toBeInTheDocument();
    const item = within(list).getAllByRole('listitem')[0]!;
    expect(within(item).getByRole('button', { name: 'Rapid IMEI' })).toBeInTheDocument();
    expect(within(item).getAllByText('Down')).toHaveLength(1);
    expect(within(item).getByText('Uptime 24h')).toBeInTheDocument();
    expect(within(item).getByText('Last 24 hours')).toBeInTheDocument();
    expect(within(item).getByText('timeout after 6000 ms')).toBeInTheDocument();
  });
});

describe('the other states of the card', () => {
  it('says "No data" in the components card and in the chart when the summary lists no component', async () => {
    mockServer.use(serveHealth(() => systemHealth({ components: [] })));
    await openHealthPage();
    const components = await card('Components');
    expect(await within(components).findByText('No data', undefined, SLOW)).toBeInTheDocument();
    expect(
      within(components).getByText(/appear here once the workers have checked them/),
    ).toBeInTheDocument();
    const chart = await card(/^Response time/);
    expect(await within(chart).findByText('No data', undefined, SLOW)).toBeInTheDocument();
  });

  it('names the permission in every card when the server answers 403', async () => {
    mockServer.use(
      http.get('*/admin/system/health', () =>
        problem(403, 'FORBIDDEN', 'Forbidden', 'The system:read permission is required.'),
      ),
    );
    await openHealthPage();
    for (const name of ['Components', 'Open alerts and incidents', 'Build']) {
      const region = await card(name);
      expect(
        await within(region).findByText('You need the system:read permission', undefined, SLOW),
      ).toBeInTheDocument();
    }
  });

  it('shows "Monitoring unavailable" in neutral, not an error, when the summary answers 503 MONITORING_UNAVAILABLE', async () => {
    mockServer.use(
      http.get('*/admin/system/health', () =>
        problem(503, 'MONITORING_UNAVAILABLE', 'Monitoring unavailable', 'Prometheus did not answer.'),
      ),
    );
    await openHealthPage();
    const components = await card('Components');
    expect(
      await within(components).findByText('Monitoring unavailable', undefined, SLOW),
    ).toBeInTheDocument();
    expect(within(components).getByText('Prometheus did not answer.')).toBeInTheDocument();
    expect(within(components).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(within(components).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('costs only the two cards that read a history answer it cannot understand, not the tab', async () => {
    // React logs every error a boundary catches; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockServer.use(
      http.get('*/admin/system/checks', () =>
        HttpResponse.json({ range: '24h', bucketSeconds: 1800, components: 'not a list' }),
      ),
    );
    await openHealthPage();
    expect(
      await screen.findByRole('heading', { name: 'The components list cannot be shown' }, SLOW),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'The response time chart cannot be shown' }, SLOW),
    ).toBeInTheDocument();
    // The cards that read the health summary stay.
    expect(
      await within(await card('Open alerts and incidents')).findByText('No open alerts', undefined, SLOW),
    ).toBeInTheDocument();
    expect(await within(await card('Build')).findByText('v1.42.0', undefined, SLOW)).toBeInTheDocument();
  });
});
