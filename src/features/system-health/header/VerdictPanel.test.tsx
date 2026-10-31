// Tests for the verdict panel, run through the whole app against the dev mock API: its tone and words in every scenario
// (healthy, degraded, outage, monitoring down, a failed health call), its links, its stale state and its live region.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupHealthMocks } from '../mocks/testing';
import { serveHealth, systemHealth } from '../test/healthFixture';
import { openHealthPage } from '../test/openHealthPage';
import { SLOW, verdictOf } from '../test/pageQueries';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

describe('the verdict', () => {
  it('is good with a check and the word Operational when everything is fine, and says why', async () => {
    await openHealthPage();
    const box = await verdictOf(/Operational/);
    expect(box).toHaveClass('bg-good-bg');
    expect(within(box).getByText(/^All \d+ components operational\.$/)).toBeInTheDocument();
    expect(within(box).getByText('No open alerts or incidents')).toBeInTheDocument();
    // A calm platform still has an order or two past SLA; the line says how many and how much is held.
    expect((await within(box).findByText(/Orders:/, undefined, SLOW)).closest('p')).toHaveTextContent(
      /Orders: 1 past SLA · \$24\.50 held · dispatch p95/,
    );
    expect(within(box).queryByRole('link', { name: /See/ })).not.toBeInTheDocument();
  });

  it('is warn when degraded: what is down, the open alerts and incident, and what it costs in orders', async () => {
    await openHealthPage({ scenario: 'degraded' });
    const box = await verdictOf(/Degraded/);
    expect(box).toHaveClass('bg-warn-bg');
    expect(within(box).getByRole('heading', { level: 2 })).toHaveTextContent(
      /Degraded\s+since \d{2}:\d{2} \(\d+m\)/,
    );
    expect(within(box).getByRole('link', { name: 'Rapid IMEI (supplier)' })).toHaveAttribute(
      'href',
      '/system-health?component=supplier%3A3',
    );
    expect(within(box).getByRole('link', { name: '2 open alerts' })).toHaveAttribute(
      'href',
      '/system-health?tab=alerts',
    );
    expect(within(box).getByText(/1 critical/)).toBeInTheDocument();
    expect(within(box).getByRole('link', { name: 'Supplier timeouts' })).toHaveAttribute(
      'href',
      '/system-health?tab=alerts&view=incidents&incident=5',
    );
    const impact = await within(box).findByText(/Orders:/, undefined, SLOW);
    expect(impact.closest('p')).toHaveTextContent(/Orders: 23 past SLA · \$1,240\.00 held · dispatch p95 \d/);
    expect(within(box).getByRole('link', { name: '23 past SLA' })).toHaveAttribute(
      'href',
      '/orders?pastSla=true',
    );
    expect(within(box).getByRole('link', { name: 'See alerts' })).toHaveAttribute(
      'href',
      '/system-health?tab=alerts',
    );
  });

  it('is critical when there is an outage, and keeps the verdict when only the order impact fails', async () => {
    await openHealthPage({ scenario: 'outage' });
    const box = await verdictOf(/Outage/);
    expect(box).toHaveClass('bg-crit-bg');
    expect(within(box).getByText('Down:')).toBeInTheDocument();
    expect(await within(box).findByText('Order impact unavailable', undefined, SLOW)).toBeInTheDocument();
    expect(within(box).getByText('The database is not accepting connections.')).toBeInTheDocument();
    expect(within(box).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('is neutral, never green, when monitoring is down: the word says why and a line explains it', async () => {
    await openHealthPage({ scenario: 'monitoring-down' });
    const box = await verdictOf(/Monitoring unavailable/);
    expect(box).toHaveClass('bg-sunken');
    expect(box).not.toHaveClass('bg-good-bg');
    // The headline already says it, so the line below gives the reason without repeating the words.
    expect(within(box).queryByText(/Monitoring is unavailable/)).not.toBeInTheDocument();
    expect(within(box).getByText(/counts as healthy until it answers/)).toBeInTheDocument();
    expect(within(box).getByText('Open alerts: no data')).toBeInTheDocument();
    // "All 14 components operational" stands only under an Operational verdict.
    expect(within(box).queryByText(/components operational/)).not.toBeInTheDocument();
  });

  it('says Status unavailable with the reason and a Retry when the health call fails, and recovers on Retry', async () => {
    let failing = true;
    mockServer.use(
      http.get('*/admin/system/health', () =>
        failing
          ? problem(500, 'INTERNAL_ERROR', 'Something went wrong', 'The health check failed.')
          : undefined,
      ),
    );
    await openHealthPage();
    const box = await verdictOf(/Status unavailable/);
    expect(box).toHaveClass('bg-sunken');
    expect(within(box).getByText('The health check failed.')).toBeInTheDocument();
    expect(within(box).getByText(/^mock-req-/)).toHaveClass('mono');
    expect(within(box).getByText(/Nothing counts as healthy/)).toBeInTheDocument();
    failing = false;
    await userEvent.setup().click(within(box).getByRole('button', { name: 'Retry' }));
    await verdictOf(/Operational/);
  });

  it('keeps the last verdict and marks it stale, with Retry, when a later refresh fails', async () => {
    let failing = false;
    mockServer.use(
      http.get('*/admin/system/health', () =>
        failing ? problem(400, 'BAD_REQUEST', 'Bad request', 'The health check failed.') : undefined,
      ),
    );
    const user = userEvent.setup();
    await openHealthPage({ scenario: 'degraded' });
    const box = await verdictOf(/Degraded/);
    expect(within(box).queryByText(/^Stale/)).not.toBeInTheDocument();
    failing = true;
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await within(box).findByText(/^Stale/, undefined, SLOW)).toBeInTheDocument();
    // The last good answer stays on screen.
    expect(within(box).getByRole('heading', { level: 2 })).toHaveTextContent('Degraded');
    expect(within(box).getByRole('link', { name: 'Rapid IMEI (supplier)' })).toBeInTheDocument();
    failing = false;
    await user.click(within(box).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(within(box).queryByText(/^Stale/)).not.toBeInTheDocument(), SLOW);
  });

  it('leaves out the links a role cannot follow: no alerts link without alerts:read', async () => {
    await openHealthPage({ scenario: 'degraded', permissions: ['system:read'] });
    const box = await verdictOf(/Degraded/);
    expect(within(box).queryByRole('link', { name: '2 open alerts' })).not.toBeInTheDocument();
    expect(within(box).getByText(/2 open alerts/)).toBeInTheDocument();
    expect(within(box).queryByRole('link', { name: /^See / })).not.toBeInTheDocument();
    expect(within(box).queryByRole('link', { name: 'Supplier timeouts' })).not.toBeInTheDocument();
    expect(within(box).queryByRole('link', { name: '23 past SLA' })).not.toBeInTheDocument();
  });

  it('announces a change of status in a polite live region, and says nothing on the first load', async () => {
    let status: 'operational' | 'outage' = 'operational';
    mockServer.use(serveHealth(() => systemHealth({ status })));
    await openHealthPage();
    await verdictOf(/Operational/);
    const region = screen.getByRole('status', { name: 'Status changes' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('');
    status = 'outage';
    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh' }));
    await verdictOf(/Outage/);
    await waitFor(() => expect(region).toHaveTextContent('System status is now Outage.'));
  });
});
