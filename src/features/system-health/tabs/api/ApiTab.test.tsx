// Tests for the API tab, opened inside the whole System health page against the dev mock API: the cards in the healthy and
// the problem scenarios, `?surface=` scoping and its "All surfaces" reset, and monitoring down.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupHealthMocks } from '../../mocks/testing';
import { openHealthPage } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';
import { recordRequests } from '../../test/recordRequests';
import { API_TAB, SURFACE_NAMES, card, rowsOf, surfacesCard } from './apiTabKit';

setupHealthMocks();
// The page and the tab are lazy chunks and every read goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

describe('the healthy scenario', () => {
  it('lists every surface with its key, the server badge and units, and folds nothing away', async () => {
    await openHealthPage({ route: API_TAB });
    const surfaces = await surfacesCard();
    for (const name of SURFACE_NAMES) {
      expect(within(surfaces).getByRole('button', { name })).toBeInTheDocument();
    }
    for (const key of ['v1', 'dhru', 'client', 'store', 'admin', 'hooks']) {
      expect(within(surfaces).getByText(key)).toHaveClass('mono');
    }
    expect(rowsOf(surfaces)).toHaveLength(6);
    expect(within(surfaces).getAllByText('OK')).toHaveLength(6);
    // Every figure keeps its unit.
    expect(within(surfaces).getAllByText(/^[\d,.]+ \/min$/).length).toBeGreaterThanOrEqual(6);
    expect(within(surfaces).getAllByText(/^[\d,.]+ ms$/).length).toBeGreaterThanOrEqual(6);
    expect(within(surfaces).getAllByText(/^[\d,.]+ %$/).length).toBeGreaterThanOrEqual(12);
    // Nothing needs attention, so there is no quiet line and no one is picked.
    expect(within(surfaces).queryByRole('button', { name: 'Show' })).not.toBeInTheDocument();
    expect(within(surfaces).queryByRole('button', { name: 'All surfaces' })).not.toBeInTheDocument();
    // Without Grafana and Sentry in the env there is no link to either.
    expect(within(surfaces).queryByRole('link')).not.toBeInTheDocument();
  });

  it('draws both charts for all surfaces, the ten slowest endpoints and the top errors with a request ID to copy', async () => {
    await openHealthPage({ route: API_TAB });
    const latency = await card('Latency');
    expect(
      await within(latency).findByRole('img', { name: 'p95 latency, All surfaces, last 24 hours' }, SLOW),
    ).toBeInTheDocument();
    const rate = await card('5xx rate');
    expect(
      await within(rate).findByRole('img', { name: '5xx rate, All surfaces, last 24 hours' }, SLOW),
    ).toBeInTheDocument();

    const slowest = await card('Slowest endpoints');
    await waitFor(() => expect(rowsOf(slowest)).toHaveLength(10), SLOW);
    expect(within(slowest).getByText('/admin/reports/finance')).toHaveClass('mono');
    expect(within(slowest).getAllByText(/^[\d,.]+ (ms|s)$/).length).toBe(10);

    const errors = await card('Top errors');
    await within(errors).findByText('INSUFFICIENT_FUNDS', undefined, SLOW);
    expect(rowsOf(errors).length).toBeGreaterThanOrEqual(5);
    expect(within(errors).getByText('INSUFFICIENT_FUNDS')).toHaveClass('mono');
    const copy = within(errors).getAllByRole('button', { name: /^Copy request ID req_/ });
    expect(copy.length).toBe(rowsOf(errors).length);
    expect(within(errors).queryByRole('link')).not.toBeInTheDocument();
    expect(within(errors).queryByRole('columnheader', { name: 'Sentry' })).not.toBeInTheDocument();
  });
});

describe('a problem scenario', () => {
  it('puts the surfaces with a problem first, folds the OK ones into one quiet line and shows them on request', async () => {
    const user = userEvent.setup();
    await openHealthPage({ scenario: 'degraded', route: API_TAB });
    const surfaces = await surfacesCard();
    const rows = rowsOf(surfaces);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Merchant API v1');
    expect(rows[0]).toHaveTextContent('Critical');
    expect(rows[1]).toHaveTextContent('Dhru Fusion API');
    expect(rows[1]).toHaveTextContent('Warn');
    expect(within(surfaces).queryByRole('button', { name: 'Client app' })).not.toBeInTheDocument();
    expect(surfaces).toHaveTextContent('4 surfaces OK');

    await user.click(within(surfaces).getByRole('button', { name: 'Show' }));
    expect(rowsOf(surfaces)).toHaveLength(6);
    expect(within(surfaces).getByRole('button', { name: 'Client app' })).toBeInTheDocument();
    // The problems are still first.
    expect(rowsOf(surfaces)[0]).toHaveTextContent('Merchant API v1');
    await user.click(within(surfaces).getByRole('button', { name: 'Hide' }));
    expect(rowsOf(surfaces)).toHaveLength(2);
  });

  it('keeps the picked surface in view while it is picked, and puts the keyboard on the quiet line when it folds away', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ scenario: 'degraded', route: `${API_TAB}&surface=client` });
    const surfaces = await surfacesCard();
    // Client app is fine; it shows only because it is picked, so the quiet line holds the other three.
    const client = within(surfaces).getByRole('button', { name: 'Client app' });
    expect(client).toHaveAttribute('aria-current', 'true');
    expect(rowsOf(surfaces)).toHaveLength(3);
    expect(surfaces).toHaveTextContent('3 surfaces OK');

    await user.click(within(surfaces).getByRole('button', { name: 'All surfaces' }));
    await waitFor(() => expect(app.location()).toBe(API_TAB), SLOW);
    // It folds into the line. Its button is gone, so the keyboard must not drop to the page: it is on Show now.
    await waitFor(() =>
      expect(within(surfaces).queryByRole('button', { name: 'Client app' })).not.toBeInTheDocument(),
    );
    expect(surfaces).toHaveTextContent('4 surfaces OK');
    expect(rowsOf(surfaces)).toHaveLength(2);
    expect(within(surfaces).getByRole('button', { name: 'Show' })).toHaveFocus();
  });

  it('leaves the keyboard on a surface that stays in view after All surfaces', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ scenario: 'degraded', route: `${API_TAB}&surface=v1` });
    const surfaces = await surfacesCard();
    await user.click(within(surfaces).getByRole('button', { name: 'All surfaces' }));
    await waitFor(() => expect(app.location()).toBe(API_TAB), SLOW);
    // Merchant API v1 has a problem, so it is still a row and keeps the keyboard.
    const v1 = within(surfaces).getByRole('button', { name: 'Merchant API v1' });
    expect(v1).not.toHaveAttribute('aria-current');
    expect(v1).toHaveFocus();
  });

  it('marks the slow figures with their state word and lists the supplier timeouts first', async () => {
    await openHealthPage({ scenario: 'degraded', route: API_TAB });
    const surfaces = await surfacesCard();
    // MeasureValue adds the state word for screen readers beside the figure.
    expect(within(surfaces).getAllByText('Critical').length).toBeGreaterThanOrEqual(2);
    const slowest = await card('Slowest endpoints');
    await waitFor(() => expect(rowsOf(slowest).length).toBe(10), SLOW);
    expect(rowsOf(slowest)[0]).toHaveTextContent('/v1/orders');
    const errors = await card('Top errors');
    await within(errors).findAllByText('SUPPLIER_TIMEOUT', undefined, SLOW);
    expect(rowsOf(errors)[0]).toHaveTextContent('SUPPLIER_TIMEOUT');
  });

  it('shows every surface in the outage, where nothing is OK enough to fold', async () => {
    await openHealthPage({ scenario: 'outage', route: API_TAB });
    const surfaces = await surfacesCard();
    expect(rowsOf(surfaces)).toHaveLength(6);
    expect(within(surfaces).getAllByText('Critical').length).toBeGreaterThanOrEqual(6);
    expect(within(surfaces).queryByRole('button', { name: 'Show' })).not.toBeInTheDocument();
  });
});

describe('?surface= scoping', () => {
  it('scopes the charts, the slowest endpoints and the top errors, keeps every surface in the table, and All surfaces clears it', async () => {
    const user = userEvent.setup();
    const metrics = recordRequests('get', '/admin/system/metrics');
    const errorReads = recordRequests('get', '/admin/system/errors');
    const app = await openHealthPage({ route: `${API_TAB}&surface=v1` });

    const surfaces = await surfacesCard();
    // The table is not narrowed: any other surface can still be chosen.
    expect(rowsOf(surfaces)).toHaveLength(6);
    expect(within(surfaces).getByRole('button', { name: 'Merchant API v1' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(within(surfaces).getByRole('button', { name: 'Dhru Fusion API' })).not.toHaveAttribute(
      'aria-current',
    );

    const latency = await card('Latency');
    expect(
      await within(latency).findByRole('img', { name: 'p95 latency, Merchant API v1, last 24 hours' }, SLOW),
    ).toBeInTheDocument();
    expect(latency).toHaveTextContent('Merchant API v1 (v1)');
    // Screen readers are told which surface the cards below the table now show.
    expect(screen.getByText('Showing Merchant API v1')).toBeInTheDocument();
    const slowest = await card('Slowest endpoints');
    await waitFor(() => expect(rowsOf(slowest)).toHaveLength(2), SLOW);
    for (const row of rowsOf(slowest)) expect(row).toHaveTextContent('/v1/orders');
    const errors = await card('Top errors');
    await within(errors).findByText('INSUFFICIENT_FUNDS', undefined, SLOW);
    for (const row of rowsOf(errors)) expect(row).toHaveTextContent('/v1/orders');

    // The scoped reads ask for the surface; the table's own read asks for none.
    expect(metrics.some((read) => read.url.searchParams.get('surface') === 'v1')).toBe(true);
    expect(metrics.some((read) => !read.url.searchParams.has('surface'))).toBe(true);
    expect(errorReads.length).toBeGreaterThan(0);
    expect(errorReads.every((read) => read.url.searchParams.get('surface') === 'v1')).toBe(true);

    await user.click(within(surfaces).getByRole('button', { name: 'All surfaces' }));
    await waitFor(() => expect(app.location()).toBe(API_TAB), SLOW);
    await waitFor(() => expect(rowsOf(slowest)).toHaveLength(10), SLOW);
    expect(
      await within(latency).findByRole('img', { name: 'p95 latency, All surfaces, last 24 hours' }, SLOW),
    ).toBeInTheDocument();
    expect(within(surfaces).queryByRole('button', { name: 'All surfaces' })).not.toBeInTheDocument();
    const v1 = within(surfaces).getByRole('button', { name: 'Merchant API v1' });
    expect(v1).not.toHaveAttribute('aria-current');
    // The button that was used is gone; the keyboard stays on the surface that had been picked.
    expect(v1).toHaveFocus();
    expect(screen.getByText('Showing all surfaces')).toBeInTheDocument();
  });

  it('chooses a surface from its name and from its row, and keeps the range and the tab in the address', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ route: `${API_TAB}&range=7d` });
    const surfaces = await surfacesCard();

    await user.click(within(surfaces).getByRole('button', { name: 'Dhru Fusion API' }));
    await waitFor(() => expect(app.location()).toBe(`${API_TAB}&range=7d&surface=dhru`), SLOW);
    const latency = await card('Latency');
    expect(
      await within(latency).findByRole('img', { name: 'p95 latency, Dhru Fusion API, last 7 days' }, SLOW),
    ).toBeInTheDocument();
    const slowest = await card('Slowest endpoints');
    await waitFor(() => expect(rowsOf(slowest)).toHaveLength(1), SLOW);
    expect(rowsOf(slowest)[0]).toHaveTextContent('/dhru/api/index.php');

    // A click on the empty part of another row chooses it too.
    const storefront = rowsOf(surfaces).find((row) => row.textContent?.includes('Storefront'));
    await user.click(within(storefront as HTMLElement).getAllByRole('cell')[2]!);
    await waitFor(() => expect(app.location()).toBe(`${API_TAB}&range=7d&surface=store`), SLOW);
  });

  it('shows the server refusal of an unknown surface in the scoped cards only, and keeps the way back', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ route: `${API_TAB}&surface=nope` });
    const surfaces = await surfacesCard();
    expect(rowsOf(surfaces)).toHaveLength(6);

    const latency = await card('Latency');
    expect(
      await within(latency).findByText('Could not load the latency', undefined, SLOW),
    ).toBeInTheDocument();
    expect(within(latency).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    const errors = await card('Top errors');
    expect(
      await within(errors).findByText('Could not load the top errors', undefined, SLOW),
    ).toBeInTheDocument();
    // The table's own read has no surface, so it is fine.
    expect(within(surfaces).queryByRole('alert')).not.toBeInTheDocument();

    await user.click(within(surfaces).getByRole('button', { name: 'All surfaces' }));
    await waitFor(() => expect(app.location()).toBe(API_TAB), SLOW);
    expect(
      await within(latency).findByRole('img', { name: 'p95 latency, All surfaces, last 24 hours' }, SLOW),
    ).toBeInTheDocument();
  });
});

describe('monitoring down', () => {
  it('shows the neutral Monitoring unavailable state on every card, never an error', async () => {
    await openHealthPage({ scenario: 'monitoring-down', route: API_TAB });
    for (const name of ['Surfaces', 'Latency', '5xx rate', 'Slowest endpoints', 'Top errors']) {
      const region = await card(name);
      expect(await within(region).findByText('Monitoring unavailable', undefined, SLOW)).toBeInTheDocument();
      expect(region.querySelector('[data-state="unavailable"]')).not.toBeNull();
      expect(within(region).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      expect(within(region).queryByRole('alert')).not.toBeInTheDocument();
      expect(within(region).queryByText(/^Could not load/)).not.toBeInTheDocument();
      // No table, no chart and no OK badge: nothing is drawn as healthy.
      expect(within(region).queryByRole('table')).not.toBeInTheDocument();
      expect(within(region).queryByRole('img')).not.toBeInTheDocument();
      expect(within(region).queryByText('OK')).not.toBeInTheDocument();
    }
    const panel = screen.getByRole('tabpanel', { name: 'API' });
    expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the way back to all surfaces and the server detail while monitoring is down', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ scenario: 'monitoring-down', route: `${API_TAB}&surface=v1` });
    const surfaces = await card('Surfaces');
    expect(await within(surfaces).findByText('Monitoring unavailable', undefined, SLOW)).toBeInTheDocument();
    expect(surfaces).toHaveTextContent('Prometheus did not answer');
    await user.click(within(surfaces).getByRole('button', { name: 'All surfaces' }));
    await waitFor(() => expect(app.location()).toBe(API_TAB), SLOW);
  });
});
