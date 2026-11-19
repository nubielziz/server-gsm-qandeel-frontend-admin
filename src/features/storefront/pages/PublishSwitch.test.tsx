// Tests for the run switch of a finished run's page: the button that takes everything the run published off the shop (or puts it
// back), its confirmation, the progress while the server switches, the note about the listings that could not be switched, the
// failures and the column "On the shop" that shows which listings moved. The mock moves a switch by reads: each wait is a 1.5 s poll.
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DASHBOARD_KEY } from '@/lib/query';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { getPublishRun } from '../api';
import { recordRequests } from '../test/requests';
import { lastOf, openRun } from '../test/publishPage';
import { tableNamed } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 40_000 });
afterEach(() => vi.restoreAllMocks());

const POLL = { timeout: 8_000 };
const RESULT = 'Publish result';
const ON_SHOP = 1;
const SWITCHED_OFF = 2;
const LISTED = /\/admin\/publish-runs\/\d+\/listed$/;

/** Watches what the page makes stale, and counts the times it was the dashboard (made stale when a switch it watched ends). */
function watchDashboard() {
  const spy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
  return () =>
    spy.mock.calls.filter(([filters]) => JSON.stringify(filters?.queryKey) === JSON.stringify(DASHBOARD_KEY))
      .length;
}

/**
 * Makes the server say that the last switch of a run failed. As the server keeps it, `listed` of the run and of the switch both
 * hold the target that was asked for (true: put on the shop, false: taken off), and the listings are part way.
 */
async function withFailedSwitch(runId: number, target: boolean) {
  await signInAs();
  const run = await getPublishRun(runId);
  mockServer.use(
    http.get(`*/admin/publish-runs/${runId}`, () =>
      HttpResponse.json({
        ...run,
        listed: target,
        switch: {
          status: 'failed',
          listed: target,
          switched: 3,
          skipped: 0,
          error: 'The switch stopped before it finished. Press it again.',
        },
      }),
    ),
  );
}

/** The "On the shop" cells of the published rows, in the table's order. */
async function onShopCells() {
  const table = await tableNamed(RESULT);
  return table
    .getAllByRole('row')
    .slice(1)
    .filter((row) => within(row).queryByText('Published'))
    .map((row) => within(row).queryByText('On') ?? within(row).queryByText('Off'))
    .map((cell) => cell?.textContent);
}

describe('taking a run off the shop', () => {
  it('asks first, says what it does, then shows the progress and the result: the listings are off and the button flips', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const dashboardReads = watchDashboard();
    await openRun(ON_SHOP);
    expect(await onShopCells()).toEqual(Array(9).fill('On'));
    expect(dashboardReads()).toBe(0);
    await user.click(await screen.findByRole('button', { name: 'Take these 9 off the shop' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Take these services off the shop?' }));
    expect(
      dialog.getByText(
        'This switches 9 listings off. Nothing is deleted and no price changes; you can put them back.',
      ),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Take them off the shop' }));
    expect(lastOf(requests, 'POST', LISTED).body).toEqual({ listed: false });
    // The next read says the switch is running, half done.
    expect(await screen.findByText('Switching 4 of 9', {}, POLL)).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Switch progress' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Take these|^Put these/ })).not.toBeInTheDocument();
    // The listings are part way, so the headline only says what the run published: never "switched off" before it is done.
    expect(screen.getByText('9 services were published')).toBeInTheDocument();
    expect(screen.queryByText(/switched off the shop/)).not.toBeInTheDocument();
    expect(dashboardReads()).toBe(0);
    // Then it is done: how many switched, the new headline, the other button and the column.
    expect(await screen.findByText('9 switched', {}, POLL)).toBeInTheDocument();
    expect(screen.getByText('9 services were switched off the shop')).toBeInTheDocument();
    expect(screen.queryByText('9 services were published')).not.toBeInTheDocument();
    // The shop changed, so the dashboard's figures are read again.
    expect(dashboardReads()).toBeGreaterThan(0);
    expect(await screen.findByText('9 services taken off the shop')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Put these 9 on the shop' })).toBeEnabled();
    await waitFor(async () => expect(await onShopCells()).toEqual(Array(9).fill('Off')));
    expect(screen.queryByText(/could not be switched/)).not.toBeInTheDocument();
  });

  it('does nothing when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openRun(ON_SHOP);
    await user.click(await screen.findByRole('button', { name: 'Take these 9 off the shop' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(requests.sent().some((sent) => LISTED.test(sent.url.pathname))).toBe(false);
  });
});

describe('putting a run on the shop', () => {
  it('puts the listings of a run created switched off on the shop and says so', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openRun(SWITCHED_OFF);
    expect(await onShopCells()).toEqual(Array(6).fill('Off'));
    await user.click(await screen.findByRole('button', { name: 'Put these 6 on the shop' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Put these services on the shop?' }));
    expect(dialog.getByText('This puts 6 listings on the shop at their current prices.')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Put them on the shop' }));
    expect(lastOf(requests, 'POST', LISTED).body).toEqual({ listed: true });
    expect(await screen.findByText('Switching 3 of 6', {}, POLL)).toBeInTheDocument();
    // One listing could not be switched (the mock leaves the last one off), and the note says where to look.
    expect(await screen.findByText('5 switched', {}, POLL)).toBeInTheDocument();
    expect(screen.getByText(/could not be switched/)).toHaveTextContent(
      '1 could not be switched (a disabled service, a closed category or no price). The column On the shop shows which.',
    );
    expect(screen.getByText('6 services are on the shop')).toBeInTheDocument();
    await waitFor(async () => expect(await onShopCells()).toEqual(['On', 'On', 'On', 'On', 'On', 'Off']));
    // The button is a "Take these off" again.
    expect(screen.getByRole('button', { name: 'Take these 6 off the shop' })).toBeEnabled();
  });
});

describe('a switch that goes wrong', () => {
  it('re-reads the run and keeps the dialog open with the server’s words when a switch is already going', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/listed', () =>
        problem(409, 'JOB_ALREADY_RUNNING', 'Already running', 'This run is being switched.'),
      ),
    );
    const requests = recordRequests();
    await openRun(ON_SHOP);
    await user.click(await screen.findByRole('button', { name: 'Take these 9 off the shop' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Take them off the shop' }),
    );
    expect(
      await within(screen.getByRole('dialog')).findByText('This run is being switched.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      const reads = requests
        .sent()
        .filter((one) => one.method === 'GET' && /\/publish-runs\/1$/.test(one.url.pathname));
      expect(reads.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows the server’s refusal of a run that published nothing', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/listed', () =>
        problem(409, 'CONFLICT', 'Not in the right state', 'This run published nothing.'),
      ),
    );
    await openRun(ON_SHOP);
    await user.click(await screen.findByRole('button', { name: 'Take these 9 off the shop' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Take them off the shop' }),
    );
    expect(
      await within(screen.getByRole('dialog')).findByText('This run published nothing.'),
    ).toBeInTheDocument();
  });

  it('shows the error of a take-off that failed, and offers the same take-off again, not the opposite', async () => {
    const user = userEvent.setup();
    await withFailedSwitch(ON_SHOP, false);
    const requests = recordRequests();
    await openRun(ON_SHOP);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The switch stopped before it finished. Press it again.',
    );
    // The listings are part way, so the page says only what was published.
    expect(screen.getByText('9 services were published')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Put these/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Take these 9 off the shop' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Take these services off the shop?' }));
    await user.click(dialog.getByRole('button', { name: 'Take them off the shop' }));
    expect(lastOf(requests, 'POST', LISTED).body).toEqual({ listed: false });
  });

  it('offers the same put-back again after one that failed', async () => {
    const user = userEvent.setup();
    await withFailedSwitch(SWITCHED_OFF, true);
    const requests = recordRequests();
    await openRun(SWITCHED_OFF);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The switch stopped before it finished. Press it again.',
    );
    expect(screen.getByText('6 services were published')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Take these/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Put these 6 on the shop' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Put these services on the shop?' }));
    await user.click(dialog.getByRole('button', { name: 'Put them on the shop' }));
    expect(lastOf(requests, 'POST', LISTED).body).toEqual({ listed: true });
  });
});
