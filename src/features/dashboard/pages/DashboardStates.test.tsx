// Tests for the dashboard's loading, refreshing and failing states: a skeleton in every panel while the first answer is on its
// way, the last answer dimmed while a new period loads, and the server's message with a working Retry.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { answerDashboard, refuse } from '../test/answers';
import { control, openDashboard, panelTitles } from '../test/dashboardPage';
import { dashboardFixture } from '../test/fixtures';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

// A promise the test settles by hand, to hold an answer back.
function gate() {
  let open!: () => void;
  const closed = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { closed, open };
}

const mainArea = () => within(screen.getByRole('main'));

describe('loading', () => {
  it('shows the title, the controls and a skeleton for every panel until the dashboard arrives', async () => {
    const hold = gate();
    answerDashboard(async () => {
      await hold.closed;
      return dashboardFixture();
    });
    await openDashboard();
    expect(control('Channel').getByRole('button', { name: 'All' })).toBeInTheDocument();
    await waitFor(() => expect(panelTitles()).toContain('Supplier health'));
    // The key figures, the attention list, the storefront funnel, the queue, the suppliers and the customers.
    expect(mainArea().getAllByRole('status', { name: 'Loading' }).length).toBeGreaterThanOrEqual(5);
    expect(mainArea().queryByText('$1,500')).not.toBeInTheDocument();

    hold.open();
    expect(await mainArea().findByText('$1,500')).toBeInTheDocument();
    await waitFor(() => expect(mainArea().queryAllByRole('status', { name: 'Loading' })).toHaveLength(0));
  });
});

describe('a new channel or period', () => {
  it('keeps the last answer on screen, dimmed and marked busy, until the new one arrives', async () => {
    const user = userEvent.setup();
    const hold = gate();
    const base = dashboardFixture();
    answerDashboard(async (url) => {
      if (url.searchParams.get('days') !== '14') return base;
      await hold.closed;
      return { ...base, stats: { ...base.stats, current: { ...base.stats.current, revenue: '9999.0000' } } };
    });
    await openDashboard();
    expect(await mainArea().findByText('$1,500')).toBeInTheDocument();
    const busy = () => mainArea().getByRole('region', { name: 'Needs attention' }).closest('[aria-busy]');
    expect(busy()).toBeNull();

    await user.click(control('Period').getByRole('button', { name: '14D' }));
    await waitFor(() => expect(busy()).not.toBeNull());
    expect(busy()).toHaveClass('opacity-[.45]');
    expect(mainArea().getByText('$1,500')).toBeInTheDocument();
    expect(mainArea().queryAllByRole('status', { name: 'Loading' })).toHaveLength(0);

    hold.open();
    expect(await mainArea().findByText('$9,999')).toBeInTheDocument();
    await waitFor(() => expect(busy()).toBeNull());
  });
});

describe('failure', () => {
  it('shows what failed in the server’s words, with the request id and a Retry that loads the page', async () => {
    const user = userEvent.setup();
    answerDashboard(refuse(403, 'FORBIDDEN', 'No access', 'The reporting service refused the request.'));
    await openDashboard();
    const alert = within(await screen.findByRole('alert'));
    expect(alert.getByRole('heading', { name: 'Could not load the dashboard' })).toBeInTheDocument();
    expect(alert.getByText('The reporting service refused the request.')).toBeInTheDocument();
    expect(alert.getByText(/mock-req-\d+/)).toBeInTheDocument();
    // The title and controls stay, so the staff member can change the channel or period.
    expect(control('Period').getByRole('button', { name: '7D' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Needs attention' })).not.toBeInTheDocument();

    answerDashboard(dashboardFixture());
    await user.click(alert.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('region', { name: 'Key figures for the last 7D' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the error title when the server sends no detail', async () => {
    answerDashboard(
      new Response(JSON.stringify({ title: 'Reports are offline', status: 409, code: 'CONFLICT' }), {
        status: 409,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    );
    await openDashboard();
    const alert = within(await screen.findByRole('alert'));
    expect(alert.getByRole('heading', { name: 'Could not load the dashboard' })).toBeInTheDocument();
    expect(alert.getByText('Reports are offline')).toBeInTheDocument();
  });
});
