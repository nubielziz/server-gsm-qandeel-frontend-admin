// Tests for the Sales funnel panel of the checkouts page, run through the whole app against the dev mock API: the four steps with the
// server's numbers and each step's share of the one before, the period kept in the address and sent to the server, and the empty and
// error states. The permission that hides the panel is tested with the rest of the permissions in CheckoutsPage.test.tsx.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { openCheckouts, serveCheckouts, serveFunnel } from '../test/checkoutsPage';
import { funnel } from '../test/fixtures';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

/** The funnel panel, once it is on the page. */
const panel = async () => within(await screen.findByRole('region', { name: 'Sales funnel' }));

describe('the funnel panel', () => {
  it("shows the four steps with the server's counts and the share of the step before", async () => {
    serveCheckouts([]);
    serveFunnel(funnel({ imeiChecks: 1200, paymentStarted: 300, paid: 120, delivered: 108 }));
    await openCheckouts();
    const steps = within((await panel()).getByRole('list', { name: 'Sales funnel, last 30 days' }));
    const items = steps.getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toEqual([
      'Checked an IMEI1,200',
      'Started a payment300 25% of the step before',
      'Paid120 40% of the step before',
      'Delivered108 90% of the step before',
    ]);
    expect(
      (await panel()).getByText('Last 30 days. How many people got from an IMEI check to a delivered order.'),
    ).toBeInTheDocument();
  });

  it('asks for the period in the address and changes it with the selector', async () => {
    const user = userEvent.setup();
    serveCheckouts([]);
    const asked = serveFunnel((days) => funnel({ days, imeiChecks: days * 10 }));
    const app = await openCheckouts('/checkouts?days=90');
    expect((await panel()).getByRole('button', { name: '90 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(asked[0].searchParams.get('days')).toBe('90');
    expect(await screen.findByText('900')).toBeInTheDocument();

    await user.click((await panel()).getByRole('button', { name: '7 days' }));
    expect(app.location()).toBe('/checkouts?days=7');
    await waitFor(() => expect(asked.at(-1)?.searchParams.get('days')).toBe('7'));
    expect(await screen.findByText('70')).toBeInTheDocument();

    await user.click((await panel()).getByRole('button', { name: '30 days' }));
    expect(app.location()).toBe('/checkouts');
  });

  it('says so when nobody reached any step in the period', async () => {
    serveCheckouts([]);
    serveFunnel(funnel({ imeiChecks: 0, paymentStarted: 0, paid: 0, delivered: 0 }));
    await openCheckouts();
    expect(await screen.findByText('No activity in this period')).toBeInTheDocument();
  });

  it("shows the server's error with Retry and recovers", async () => {
    const user = userEvent.setup();
    serveCheckouts([]);
    mockServer.use(
      http.get('*/admin/reports/funnel', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'Reports are off for you.'),
      ),
    );
    await openCheckouts();
    expect(await screen.findByText('Could not load the funnel')).toBeInTheDocument();
    expect(screen.getByText('Reports are off for you.')).toBeInTheDocument();
    serveFunnel(funnel());
    await user.click((await panel()).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Checked an IMEI')).toBeInTheDocument();
  });

  it('works out the funnel from the mock tables by default', async () => {
    await openCheckouts();
    const steps = within((await panel()).getByRole('list', { name: 'Sales funnel, last 30 days' }));
    expect(await steps.findAllByRole('listitem')).toHaveLength(4);
    expect(steps.getByText('Paid')).toBeInTheDocument();
  });
});
