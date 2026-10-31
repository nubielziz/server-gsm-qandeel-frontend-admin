// Tests for the KPI row, run through the whole app against the dev mock API: each tile's figure, state and threshold, and how
// one failing source shows its problem in its own tile while the others keep their figures.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupHealthMocks } from '../mocks/testing';
import { openHealthPage } from '../test/openHealthPage';
import { SLOW, tileNamed, verdictOf } from '../test/pageQueries';
import { recordRequests } from '../test/recordRequests';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

describe('the key figures', () => {
  it('shows each with its value, the server state word, the trend window and the threshold', async () => {
    await openHealthPage({ scenario: 'degraded' });
    await waitFor(() => expect(tileNamed('Orders past SLA')).toHaveTextContent('23'), SLOW);
    const pastSla = tileNamed('Orders past SLA');
    expect(pastSla).toHaveTextContent('Critical');
    expect(pastSla).toHaveTextContent('24h');
    expect(pastSla).toHaveTextContent('warn 5');
    expect(tileNamed('Uptime 30 days')).toHaveTextContent('target 99.9 %');
    expect(tileNamed('Uptime 30 days')).toHaveTextContent('30 days');
    expect(tileNamed('Open alerts')).toHaveTextContent('1 critical');
    expect(tileNamed('Oldest queued job')).toHaveTextContent('warn 2m');
  });

  it('keeps the other tiles when one source fails, and shows that tile what failed, the request id and Retry', async () => {
    await openHealthPage({ scenario: 'partial-failure' });
    const oldest = tileNamed('Oldest queued job');
    expect(await within(oldest).findByText('Could not load', undefined, SLOW)).toBeInTheDocument();
    expect(within(oldest).getByText('The queue counters could not be read.')).toBeInTheDocument();
    expect(within(oldest).getByText(/^mock-req-/)).toBeInTheDocument();
    expect(within(oldest).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    // The other five keep their figures, and the verdict does not change.
    await waitFor(() => expect(tileNamed('Uptime 30 days')).toHaveTextContent('%'), SLOW);
    await waitFor(() => expect(tileNamed('API p95')).toHaveTextContent('ms'), SLOW);
    await waitFor(() => expect(tileNamed('Orders past SLA')).toHaveTextContent(/\d/), SLOW);
    expect(tileNamed('Open alerts')).toHaveTextContent(/\d/);
    await verdictOf(/Operational/);
  });

  it('draws the tiles whose source is the monitoring system as neutral "Monitoring unavailable", not as errors', async () => {
    await openHealthPage({ scenario: 'monitoring-down' });
    const p95 = tileNamed('API p95');
    expect(await within(p95).findByText('Monitoring unavailable', undefined, SLOW)).toBeInTheDocument();
    expect(within(tileNamed('5xx rate')).getByText('Monitoring unavailable')).toBeInTheDocument();
    expect(within(p95).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(within(p95).queryByText('OK')).not.toBeInTheDocument();
    // Open alerts cannot be known without monitoring: no data, not zero and not green.
    await waitFor(() => expect(tileNamed('Open alerts')).toHaveTextContent('No data'), SLOW);
    expect(tileNamed('Open alerts')).not.toHaveTextContent('OK');
  });

  it('asks for the last 24 hours whatever range the page is set to', async () => {
    const reads = recordRequests('get', '/admin/system/metrics');
    await openHealthPage({ route: '/system-health?range=7d' });
    await waitFor(() => expect(reads.length).toBeGreaterThan(0), SLOW);
    expect(reads.map((read) => read.url.searchParams.get('range'))).toEqual(['24h']);
    expect(screen.getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks a tile stale when its last refresh failed but keeps the last figure', async () => {
    let calls = 0;
    mockServer.use(
      http.get('*/admin/system/orders-health', () => {
        calls += 1;
        // The first answer is the mock's; later ones fail.
        return calls === 1 ? undefined : HttpResponse.json({ title: 'Down' }, { status: 400 });
      }),
    );
    await openHealthPage({ scenario: 'degraded' });
    await waitFor(() => expect(tileNamed('Orders past SLA')).toHaveTextContent('23'), SLOW);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(tileNamed('Orders past SLA')).toHaveTextContent('Stale'), SLOW);
    expect(tileNamed('Orders past SLA')).toHaveTextContent('23');
  });
});
