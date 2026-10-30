// Tests for the dashboard page, run through the whole app against the dev mock API: the header and its controls in the
// address, the key figures, which panels each channel shows, the period, and the chart range and view.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { answerDashboard } from '../test/answers';
import { control, openDashboard, panelOf, panelTitles } from '../test/dashboardPage';
import { dashboardFixture } from '../test/fixtures';

setupMockApi();
// The page is a lazy chunk and every flow goes through the mock API, so give the slow first test room.
vi.setConfig({ testTimeout: 20_000 });

const ALL_PANELS = [
  'Needs attention',
  'Orders by type',
  'Revenue by channel',
  'Storefront funnel',
  'Open queue by type',
  'Supplier health',
  'Top merchants',
  'Top customers',
];

const pressed = (group: string, name: string) =>
  control(group).getByRole('button', { name }).getAttribute('aria-pressed');

describe('header and layout', () => {
  it('opens on all channels and 7 days, with the demo’s panels in the demo’s order', async () => {
    await openDashboard();
    expect(
      screen.getByText(/Showing all channels\. Figures cover orders created in the selected period\./),
    ).toBeInTheDocument();
    expect(pressed('Channel', 'All')).toBe('true');
    expect(pressed('Period', '7D')).toBe('true');
    expect(pressed('Date range', '30D')).toBe('true');
    expect(pressed('View', 'Chart')).toBe('true');
    await waitFor(() => expect(panelTitles()).toEqual(ALL_PANELS));
    expect(await screen.findByRole('region', { name: 'Key figures for the last 7D' })).toBeInTheDocument();
  });

  it('keeps the controls in the address and reads them back, with bad values falling back to the defaults', async () => {
    await openDashboard('/dashboard?scope=b2c&days=14&range=12M&view=table');
    expect(pressed('Channel', 'Storefront')).toBe('true');
    expect(pressed('Period', '14D')).toBe('true');
    expect(pressed('Date range', '12M')).toBe('true');
    expect(pressed('View', 'Table')).toBe('true');
    expect(screen.getByText(/Showing the storefront\./)).toBeInTheDocument();
  });

  it('ignores values it does not know', async () => {
    await openDashboard('/dashboard?scope=everyone&days=99&range=1Y&view=pie');
    expect(pressed('Channel', 'All')).toBe('true');
    expect(pressed('Period', '7D')).toBe('true');
    expect(pressed('Date range', '30D')).toBe('true');
    expect(pressed('View', 'Chart')).toBe('true');
  });
});

describe('key figures', () => {
  it('shows the five figures with their change against the previous period', async () => {
    answerDashboard(dashboardFixture());
    await openDashboard();
    const strip = within(await screen.findByRole('region', { name: 'Key figures for the last 7D' }));
    const cell = (label: string) => within(strip.getByText(label).closest('div.min-w-0') as HTMLElement);

    expect(cell('Revenue').getByText('$1,500')).toBeInTheDocument();
    expect(cell('Revenue').getByText('50.0%')).toBeInTheDocument();
    expect(cell('Revenue').getByText(', better')).toHaveClass('sr-only');
    expect(cell('Gross profit').getByText('$300')).toBeInTheDocument();
    expect(cell('Gross profit').getByText('14.3%')).toBeInTheDocument();
    expect(cell('Gross profit').getByText(', worse')).toHaveClass('sr-only');
    expect(cell('Orders').getByText('40')).toBeInTheDocument();
    expect(cell('Orders').getByText('No change')).toBeInTheDocument();
    expect(cell('Success rate').getByText('95%')).toBeInTheDocument();
    expect(cell('Success rate').getByText('5.0 pts')).toBeInTheDocument();
    // Turnaround fell from 15 to 10 minutes: lower is better.
    expect(cell('Median turnaround').getByText('10 min')).toBeInTheDocument();
    expect(cell('Median turnaround').getByText('33.3%')).toBeInTheDocument();
    expect(cell('Median turnaround').getByText(', better')).toBeInTheDocument();
  });

  it('says "No earlier data" without a previous period and a dash for rates it cannot measure', async () => {
    const base = dashboardFixture();
    answerDashboard({
      ...base,
      stats: {
        current: { ...base.stats.current, orders: 0, successRate: null, medianTurnaroundSeconds: null },
        previous: null,
      },
    });
    await openDashboard();
    const strip = within(await screen.findByRole('region', { name: 'Key figures for the last 7D' }));
    expect(strip.getAllByText('No earlier data')).toHaveLength(3);
    expect(strip.getAllByText('No data yet')).toHaveLength(2);
    expect(strip.getAllByText('–')).toHaveLength(2);
  });

  it('explains each figure in a note from its (i) button', async () => {
    const user = userEvent.setup();
    answerDashboard(dashboardFixture());
    await openDashboard();
    await user.click(await screen.findByRole('button', { name: 'About Revenue' }));
    const note = await screen.findByRole('dialog', { name: 'Revenue' });
    expect(note).toHaveTextContent(
      'Price of completed orders in the period. Arrows compare with the previous 7 days.',
    );
  });
});

describe('channel', () => {
  it('shows the panels of the channel: merchants hide the storefront ones, the storefront hides the merchant ones', async () => {
    const user = userEvent.setup();
    const app = await openDashboard();
    await waitFor(() => expect(panelTitles()).toEqual(ALL_PANELS));

    await user.click(control('Channel').getByRole('button', { name: 'Merchants' }));
    expect(app.location()).toBe('/dashboard?scope=b2b');
    await waitFor(() =>
      expect(panelTitles()).toEqual([
        'Needs attention',
        'Orders by type',
        'Open queue by type',
        'Supplier health',
        'Top merchants',
      ]),
    );
    expect(screen.getByText(/Showing merchants\./)).toBeInTheDocument();

    await user.click(control('Channel').getByRole('button', { name: 'Storefront' }));
    expect(app.location()).toBe('/dashboard?scope=b2c');
    await waitFor(() =>
      expect(panelTitles()).toEqual([
        'Needs attention',
        'Orders by type',
        'Storefront funnel',
        'Open queue by type',
        'Supplier health',
        'Top customers',
      ]),
    );
    expect(screen.getByText(/Showing the storefront\./)).toBeInTheDocument();

    // All channels is the default, so it leaves the address.
    await user.click(control('Channel').getByRole('button', { name: 'All' }));
    expect(app.location()).toBe('/dashboard');
    await waitFor(() => expect(panelTitles()).toEqual(ALL_PANELS));
  });

  it('asks the server for the channel it shows', async () => {
    const user = userEvent.setup();
    const seen = answerDashboard(dashboardFixture());
    await openDashboard();
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    await user.click(control('Channel').getByRole('button', { name: 'Merchants' }));
    await waitFor(() => expect(seen.map((url) => url.searchParams.get('scope'))).toContain('b2b'));
  });
});

describe('period', () => {
  it('asks again for 14 days and 24 hours, and words the period in the panels', async () => {
    const user = userEvent.setup();
    const app = await openDashboard();
    await screen.findByRole('region', { name: 'Key figures for the last 7D' });
    expect(await screen.findByText('By spend, last 7 days')).toBeInTheDocument();

    await user.click(control('Period').getByRole('button', { name: '14D' }));
    expect(app.location()).toBe('/dashboard?days=14');
    expect(await screen.findByRole('region', { name: 'Key figures for the last 14D' })).toBeInTheDocument();
    expect(await screen.findByText('By spend, last 14 days')).toBeInTheDocument();
    expect(screen.getByText('Storefront, by spend, last 14 days')).toBeInTheDocument();

    await user.click(control('Period').getByRole('button', { name: '24h' }));
    expect(app.location()).toBe('/dashboard?days=1');
    expect(await screen.findByRole('region', { name: 'Key figures for the last 24h' })).toBeInTheDocument();
    expect(await screen.findByText('By spend, last 24 hours')).toBeInTheDocument();
    // The note of a figure says which period the arrows compare with.
    await user.click(screen.getByRole('button', { name: 'About Revenue' }));
    expect(await screen.findByRole('dialog', { name: 'Revenue' })).toHaveTextContent(
      'Arrows compare with the previous 24 hours.',
    );
  });

  it('refetches with the new period', async () => {
    const user = userEvent.setup();
    const seen = answerDashboard(dashboardFixture());
    await openDashboard();
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].search).toBe('?scope=all&days=7');
    await user.click(control('Period').getByRole('button', { name: '14D' }));
    await waitFor(() => expect(seen).toHaveLength(2));
    expect(seen[1].search).toBe('?scope=all&days=14');
  });
});

describe('orders by type', () => {
  it('draws a chart named for what it shows, then the same numbers as a table', async () => {
    const user = userEvent.setup();
    const app = await openDashboard();
    const panel = await panelOf('Orders by type');
    expect(
      await panel.findByRole('img', {
        name: /^Stacked bar chart of orders per day by service type, 30D, for all channels\. \d+ orders in total\./,
      }),
    ).toBeInTheDocument();
    expect(panel.getByText(/orders from all channels, per day$/)).toBeInTheDocument();

    await user.click(control('View').getByRole('button', { name: 'Table' }));
    expect(app.location()).toBe('/dashboard?view=table');
    const table = within(await panel.findByRole('table', { name: 'Orders by type' }));
    expect(table.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Period',
      'IMEI',
      'Server',
      'Remote',
      'File',
      'Total',
    ]);
    expect(table.getAllByRole('row')).toHaveLength(31);
    expect(panel.queryByRole('img')).not.toBeInTheDocument();

    await user.click(control('View').getByRole('button', { name: 'Chart' }));
    expect(app.location()).toBe('/dashboard');
  });

  it('shows 7 days, 30 days or 12 months', async () => {
    const user = userEvent.setup();
    answerDashboard(dashboardFixture());
    const app = await openDashboard('/dashboard?view=table');
    const panel = await panelOf('Orders by type');
    expect(await panel.findAllByRole('row')).toHaveLength(31);

    await user.click(control('Date range').getByRole('button', { name: '7D' }));
    expect(app.location()).toBe('/dashboard?view=table&range=7D');
    expect(panel.getAllByRole('row')).toHaveLength(8);

    await user.click(control('Date range').getByRole('button', { name: '12M' }));
    expect(panel.getAllByRole('row')).toHaveLength(13);
    expect(panel.getByText(/monthly$/)).toBeInTheDocument();
  });

  it('shows 30 days with a note when the channel has no yearly history', async () => {
    await openDashboard('/dashboard?scope=b2c&range=12M');
    const panel = await panelOf('Orders by type');
    expect(
      await panel.findByText(/per day\. The storefront has no yearly history yet, so this shows 30 days\.$/),
    ).toBeInTheDocument();
    expect(
      panel.getByRole('img', { name: /orders per day by service type, 30D, for the storefront\./ }),
    ).toBeInTheDocument();
    // The demo's notes described its fake history; the real data has none of them.
    expect(screen.queryByText(/synthetic/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/included in the latest month/i)).not.toBeInTheDocument();
  });

  it('says so when there are no orders in the range', async () => {
    const base = dashboardFixture();
    answerDashboard({
      ...base,
      ordersByType: {
        daily: base.ordersByType.daily.map((day) => ({ ...day, imei: 0, server: 0, remote: 0, file: 0 })),
        monthly: null,
      },
    });
    await openDashboard();
    const panel = await panelOf('Orders by type');
    expect(await panel.findByText('No orders in this range')).toBeInTheDocument();
    expect(panel.queryByRole('img')).not.toBeInTheDocument();
  });

  it('lets the legend hide a series but never the last one', async () => {
    const user = userEvent.setup();
    answerDashboard(dashboardFixture());
    await openDashboard();
    const panel = await panelOf('Orders by type');
    const legend = within(await panel.findByRole('group', { name: 'Series' }));
    for (const name of [/^IMEI/, /^Server/, /^Remote/]) {
      await user.click(legend.getByRole('button', { name }));
    }
    expect(legend.getByRole('button', { name: /^IMEI/ })).toHaveAttribute('aria-pressed', 'false');
    // File is the last visible series: pressing it does nothing.
    await user.click(legend.getByRole('button', { name: /^File/ }));
    expect(legend.getByRole('button', { name: /^File/ })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('revenue by channel', () => {
  it('shows the legend totals the server sent and the storefront’s share, for 30 days or 7', async () => {
    const user = userEvent.setup();
    answerDashboard(dashboardFixture());
    await openDashboard();
    const panel = await panelOf('Revenue by channel');
    expect(await panel.findByText('Completed orders, last 30 days, before VAT')).toBeInTheDocument();
    expect(panel.getByText('$3,000')).toBeInTheDocument();
    expect(panel.getByText('$1,000')).toBeInTheDocument();
    expect(panel.getByText('Storefront share 25%')).toBeInTheDocument();
    expect(
      panel.getByRole('img', {
        name: /last 30 days\. \$3,000 from merchants and \$1,000 from the storefront\.$/,
      }),
    ).toBeInTheDocument();

    await user.click(control('Date range').getByRole('button', { name: '7D' }));
    expect(panel.getByText('Completed orders, last 7 days, before VAT')).toBeInTheDocument();
    expect(panel.getByText('$700')).toBeInTheDocument();
    expect(panel.getByText('$300')).toBeInTheDocument();
    expect(panel.getByText('Storefront share 30%')).toBeInTheDocument();
  });

  it('says so when nothing was completed', async () => {
    const base = dashboardFixture();
    answerDashboard({
      ...base,
      revenueByChannel: {
        daily: base.revenueByChannel!.daily,
        totals: {
          last7Days: { b2b: '0.0000', b2c: '0.0000' },
          last30Days: { b2b: '0.0000', b2c: '0.0000' },
        },
      },
    });
    await openDashboard();
    const panel = await panelOf('Revenue by channel');
    expect(await panel.findByText('No completed orders in this range')).toBeInTheDocument();
  });

  it('stays out when the server sends no revenue split', async () => {
    answerDashboard(dashboardFixture({ revenueByChannel: null }));
    await openDashboard();
    await screen.findByRole('region', { name: 'Needs attention' });
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Revenue by channel' })).toBeNull());
  });
});
