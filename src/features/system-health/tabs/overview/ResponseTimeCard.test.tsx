// Tests for the picked component of the Overview tab (`?component=`) and the response time chart that follows it, run through
// the whole app against the dev mock API.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupHealthMocks } from '../../mocks/testing';
import { openHealthPage } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';
import { recordRequests } from '../../test/recordRequests';
import { card } from './overviewKit';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

afterEach(() => vi.restoreAllMocks());

describe('the picked component and its chart', () => {
  it('charts the worst component by default, and names it with the range in the title', async () => {
    await openHealthPage({ scenario: 'degraded' });
    const chart = await card('Response time · Rapid IMEI · last 24 hours');
    expect(
      await within(chart).findByText(/^p95 of the checks in each 30m bucket\./, undefined, SLOW),
    ).toBeInTheDocument();
    expect(
      await within(chart).findByRole('img', { name: 'Rapid IMEI response time, last 24 hours' }, SLOW),
    ).toBeInTheDocument();
    expect(within(chart).getByRole('button', { name: 'Table view' })).toBeInTheDocument();
    // The default is not written to the address.
    expect(
      within(screen.getByRole('region', { name: 'Components' })).getByRole('button', { name: 'Rapid IMEI' }),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('says in words how the charted component stands, so a flat line under the threshold never passes for healthy', async () => {
    await openHealthPage({ scenario: 'outage' });
    // Postgres is down: its checks draw a flat line far below the threshold, and the badge beside the title says "Down".
    const chart = await card('Response time · Postgres · last 24 hours');
    expect(await within(chart).findByText('Down', undefined, SLOW)).toBeInTheDocument();
    expect(
      await within(chart).findByRole('img', { name: /^Postgres response time/ }, SLOW),
    ).toBeInTheDocument();
  });

  it('leaves a healthy component without a badge (its row says OK), and gives the one that is picked next its own', async () => {
    const user = userEvent.setup();
    await openHealthPage({ scenario: 'degraded', route: '/system-health?component=redis' });
    const chart = await card('Response time · Redis · last 24 hours');
    await within(chart).findByRole('img', { name: /^Redis response time/ }, SLOW);
    expect(within(chart).queryByText('OK')).not.toBeInTheDocument();
    expect(chart.querySelector('.badge')).toBeNull();
    // The picked healthy component stays in the list, so its status is still in view.
    const components = await card('Components');
    expect(
      within(within(components).getByRole('button', { name: 'Redis' }).closest('tr')!).getByText('OK'),
    ).toBeInTheDocument();

    await user.click(within(components).getByRole('button', { name: 'Rapid IMEI' }));
    const next = await card('Response time · Rapid IMEI · last 24 hours');
    expect(await within(next).findByText('Down', undefined, SLOW)).toBeInTheDocument();
  });

  it('dims the line of the old range while the line of the new one loads, and draws it plainly after', async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Only the chart's read of another range waits: the bars of the list ask without a component.
    mockServer.use(
      http.get('*/admin/system/checks', async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('range') === '7d' && url.searchParams.has('component')) await held;
        return undefined;
      }),
    );
    await openHealthPage();
    const chart = await card('Response time · API · last 24 hours');
    await within(chart).findByRole('img', { name: 'API response time, last 24 hours' }, SLOW);
    expect(chart.querySelector('[aria-busy]')).toBeNull();

    await user.click(screen.getByRole('button', { name: '7d' }));
    // The title already names the new range; the line is still the old one, and says it is busy.
    const busy = await waitFor(() => {
      const element = chart.querySelector('[aria-busy="true"]');
      expect(element).not.toBeNull();
      return element as HTMLElement;
    }, SLOW);
    expect(busy).toHaveClass('opacity-60');
    expect(within(busy).getByRole('img', { name: 'API response time, last 24 hours' })).toBeInTheDocument();

    release();
    expect(
      await within(chart).findByRole('img', { name: 'API response time, last 7 days' }, SLOW),
    ).toBeInTheDocument();
    await waitFor(() => expect(chart.querySelector('[aria-busy]')).toBeNull(), SLOW);
  });

  it('charts the first component of a healthy platform, and follows the range in the title', async () => {
    await openHealthPage({ route: '/system-health?range=1h' });
    expect(await card('Response time · API · last hour')).toBeInTheDocument();
  });

  it('charts the component named in the address and marks its row', async () => {
    const user = userEvent.setup();
    await openHealthPage({ route: '/system-health?component=postgres' });
    expect(await card('Response time · Postgres · last 24 hours')).toBeInTheDocument();
    const components = await card('Components');
    await user.click(await within(components).findByRole('button', { name: /^Show/ }, SLOW));
    expect(within(components).getByRole('button', { name: 'Postgres' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(within(components).getByRole('button', { name: 'API' })).not.toHaveAttribute('aria-current');
  });

  it('opens the component a verdict link names, with the colon of a supplier key in the address', async () => {
    await openHealthPage({ scenario: 'degraded', route: '/system-health?component=supplier%3A2' });
    expect(await card('Response time · Gulf Server Hub · last 24 hours')).toBeInTheDocument();
  });

  it('shows the default with a note when the address names a component the summary does not know', async () => {
    await openHealthPage({ route: '/system-health?component=bogus' });
    const chart = await card('Response time · API · last 24 hours');
    expect(within(chart).getByText('bogus')).toHaveClass('mono');
    expect(within(chart).getByText(/is not a known component, so this shows API\./)).toBeInTheDocument();
  });

  it('puts ?component= in the address when a row is chosen, by the name button or by a click on the row, and keeps the range', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ scenario: 'degraded', route: '/system-health?range=6h' });
    const components = await card('Components');
    await user.click(await within(components).findByRole('button', { name: /^Show/ }, SLOW));

    await user.click(within(components).getByRole('button', { name: 'Postgres' }));
    await waitFor(() => expect(app.location()).toBe('/system-health?range=6h&component=postgres'), SLOW);
    expect(await card('Response time · Postgres · last 6 hours')).toBeInTheDocument();
    expect(within(components).getByRole('button', { name: 'Postgres' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(within(components).getByRole('button', { name: 'Rapid IMEI' })).not.toHaveAttribute(
      'aria-current',
    );

    // A click on the empty part of a row (its status badge cell) does the same.
    const redisRow = within(components).getByRole('button', { name: 'Redis' }).closest('tr')!;
    await user.click(within(redisRow).getByText('OK'));
    await waitFor(() => expect(app.location()).toBe('/system-health?range=6h&component=redis'), SLOW);
    expect(await card('Response time · Redis · last 6 hours')).toBeInTheDocument();
  });

  it('can be chosen with the keyboard: the name is a button', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ scenario: 'degraded' });
    const components = await card('Components');
    await user.click(await within(components).findByRole('button', { name: /^Show/ }, SLOW));
    within(components).getByRole('button', { name: 'Redis' }).focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(app.location()).toBe('/system-health?component=redis'), SLOW);
  });

  it('asks the server for the picked component only', async () => {
    const reads = recordRequests('get', '/admin/system/checks');
    await openHealthPage({ route: '/system-health?component=redis' });
    await card('Response time · Redis · last 24 hours');
    await waitFor(
      () => expect(reads.some((read) => read.url.searchParams.get('component') === 'redis')).toBe(true),
      SLOW,
    );
    expect(reads.some((read) => read.url.searchParams.get('component') === 'api')).toBe(false);
  });
});
