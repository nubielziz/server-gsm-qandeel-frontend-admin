// Tests for the one "On the shop" switch (usePutOnShop), mounted on its own through a test host, against the dev mock API: a shop page is switched on or off; a service without one
// goes on the shop through a one-service run applied only when its row is ready, and is discarded otherwise with the server's reason and
// the next step; a busy row and a failing call each keep the switch where it was. The lock of each move (its permission, the server's
// reason) is tested with the words in lib/shopSwitch.test.ts.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { recordRequests } from '../test/requests';
import { ShopSwitchProbe } from '../test/ShopSwitchProbe';
import { SHOP_SWITCH_WAIT } from './usePutOnShop';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());
const DEFAULT_WAIT = { ...SHOP_SWITCH_WAIT };
afterEach(() => void Object.assign(SHOP_SWITCH_WAIT, DEFAULT_WAIT));

type User = ReturnType<typeof userEvent.setup>;

/** The query part of the address, without the `?`. */
const queryOf = (location: string | null) => (location ?? '').split('?')[1] ?? '';

// Z3X Credits x10 (service 15) has no shop page and nothing blocks it; the mock's next run is run 8.
const Z3X = 'Z3X Credits x10';
const RUN = 8;
// A discarded draft is no place to go: the step "Open the run" starts a new draft from its rows (the next run) and opens that one.
const REVIEW = RUN + 1;
const TOTAL = { 'x-total-count': '1', 'access-control-expose-headers': 'x-total-count' };

/** Answers the run's rows with one row of the server's shape (only the keys the switch reads matter here). */
function rowsAnswer(...rows: Record<string, unknown>[]) {
  let read = 0;
  mockServer.use(
    http.get('*/admin/publish-runs/:id/items', () => {
      const row = rows[Math.min(read, rows.length - 1)];
      read += 1;
      return HttpResponse.json(
        [{ id: 1, serviceId: 15, flags: [], result: null, resultReason: null, ...row }],
        {
          headers: TOTAL,
        },
      );
    }),
  );
}

/**
 * Plays the server's run for a test that needs the worker to be slow or the apply's answer to go missing: the run is read as these statuses
 * in turn (the last repeats), and its apply answers 202. The waits are shortened so the test does not take a minute.
 */
function runReads(...statuses: string[]) {
  Object.assign(SHOP_SWITCH_WAIT, { pollMs: 5, maxReads: 3, slowPollMs: 5, slowMaxReads: 40 });
  let read = 0;
  mockServer.use(
    http.get('*/admin/publish-runs/:id', () => {
      const status = statuses[Math.min(read, statuses.length - 1)];
      read += 1;
      return HttpResponse.json({ id: RUN, status, error: null });
    }),
    http.post('*/admin/publish-runs/:id/apply', () =>
      HttpResponse.json({ id: RUN, status: 'queued', error: null }, { status: 202 }),
    ),
  );
}

const sentTo = (requests: ReturnType<typeof recordRequests>, method: string, path: string) =>
  requests.sent().filter((sent) => sent.method === method && sent.url.pathname === path);

/** Signs in and mounts the switches of the services a search finds. */
async function openSwitches(q: string) {
  await signInAs();
  return renderShell('/probe', <Route path="/probe" element={<ShopSwitchProbe q={q} />} />);
}

async function pressSwitch(user: User, name: string) {
  const toggle = await screen.findByRole('switch', { name: `${name} on the shop` });
  await user.click(toggle);
  return toggle;
}

describe('a service that has a shop page', () => {
  it('takes the page off the shop and puts it back', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openSwitches('EE UK Unlock');
    await pressSwitch(user, 'EE UK Unlock');
    expect(await screen.findByText('EE UK Unlock is off the shop')).toBeInTheDocument();
    expect(sentTo(requests, 'PATCH', '/admin/service-listings/9')[0]?.body).toEqual({ isListed: false });
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'EE UK Unlock on the shop' })).toHaveAttribute(
        'aria-checked',
        'false',
      ),
    );

    await pressSwitch(user, 'EE UK Unlock');
    expect(await screen.findByText('EE UK Unlock is on the shop')).toBeInTheDocument();
    expect(sentTo(requests, 'PATCH', '/admin/service-listings/9')[1]?.body).toEqual({ isListed: true });
    // No publish run is made for a service that has a page.
    expect(sentTo(requests, 'POST', '/admin/publish-runs')).toHaveLength(0);
  });

  it('shows the server’s refusal and leaves the switch where it was', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/service-listings/:id', () =>
        problem(409, 'LISTING_LOCKED', 'Listing locked', 'The shop is being rebuilt.'),
      ),
    );
    await openSwitches('EE UK Unlock');
    const toggle = await pressSwitch(user, 'EE UK Unlock');
    expect(await screen.findByText('Could not take EE UK Unlock off the shop')).toBeInTheDocument();
    expect(screen.getByText('The shop is being rebuilt.')).toBeInTheDocument();
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});

describe('a service without a shop page', () => {
  it('puts it on the shop when the server says its row is ready, waiting while it works', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openSwitches('Z3X');
    const toggle = await pressSwitch(user, Z3X);
    // Busy: the switch waits and a second press sends nothing.
    await waitFor(() => expect(toggle).toBeDisabled());
    expect(toggle).toHaveAttribute('aria-busy', 'true');
    await user.click(toggle);

    expect(
      await screen.findByText(`${Z3X} is on the shop`, undefined, { timeout: 15_000 }),
    ).toBeInTheDocument();
    const created = sentTo(requests, 'POST', '/admin/publish-runs');
    expect(created).toHaveLength(1);
    expect(created[0].body).toEqual({ scope: { kind: 'services', serviceIds: [15] } });
    expect(sentTo(requests, 'POST', `/admin/publish-runs/${RUN}/apply`)).toHaveLength(1);
    expect(sentTo(requests, 'POST', `/admin/publish-runs/${RUN}/cancel`)).toHaveLength(0);
    await waitFor(() => expect(toggle).toBeEnabled());
  });

  it.each([
    {
      kind: 'no shop price rule',
      row: {
        state: 'blocked',
        included: false,
        blockedReason: 'price_missing',
        flags: ['no_rule', 'no_brand'],
      },
      words: /no shop price rule covers it\. Make a shop price rule, then try again\./,
      step: 'Make a shop price rule',
      opens: 'view=rules&tab=shop',
    },
    {
      kind: 'a zero cost',
      row: { state: 'blocked', included: false, blockedReason: 'price_missing', flags: ['no_cost'] },
      words: /its cost is zero, so no rule can price it/,
      step: 'Open the run',
      opens: `view=publish&run=${REVIEW}`,
    },
    {
      kind: 'a price under the floor',
      row: { state: 'blocked', included: false, blockedReason: 'below_floor' },
      words: /its shop price is under the floor/,
      step: 'Open the run',
      opens: `view=publish&run=${REVIEW}`,
    },
    {
      kind: 'a name the server flags',
      row: { state: 'review', included: false, flags: ['duplicate_name'] },
      words: /the server flags it: another service has the same supplier name\. Open the run to review it\./,
      step: 'Open the run',
      opens: `view=publish&run=${REVIEW}`,
    },
    {
      kind: 'no supplier that can fill it',
      row: { state: 'blocked', included: false, blockedReason: 'supplier_unavailable' },
      words: /no supplier can fill it now\. Link or resume a supplier, then try again\./,
      step: null,
      opens: null,
    },
  ])(
    'publishes nothing for $kind: the draft is discarded and the reason told with the next step',
    async (c) => {
      const user = userEvent.setup();
      const requests = recordRequests();
      rowsAnswer(c.row);
      const app = await openSwitches('Z3X');
      const toggle = await pressSwitch(user, Z3X);
      expect(
        await screen.findByText(`${Z3X} was not put on the shop`, undefined, { timeout: 15_000 }),
      ).toBeInTheDocument();
      expect(screen.getByText(c.words)).toBeInTheDocument();
      expect(sentTo(requests, 'POST', `/admin/publish-runs/${RUN}/cancel`)).toHaveLength(1);
      expect(sentTo(requests, 'POST', `/admin/publish-runs/${RUN}/apply`)).toHaveLength(0);
      await waitFor(() => expect(toggle).toBeEnabled());
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      if (c.step === null) {
        expect(screen.queryByRole('button', { name: 'Open the run' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Make a shop price rule' })).not.toBeInTheDocument();
      } else {
        await user.click(screen.getByRole('button', { name: c.step }));
        await waitFor(() => expect(queryOf(app.location())).toBe(c.opens));
        if (c.step === 'Open the run') {
          // The discarded draft only says it was discarded: the step made a new draft from its rows and opened that one.
          expect(sentTo(requests, 'POST', '/admin/publish-runs').map((sent) => sent.body)).toEqual([
            { scope: { kind: 'services', serviceIds: [15] } },
            { scope: { kind: 'run', runId: RUN } },
          ]);
        }
      }
    },
  );

  it('tells what the run found when the row was refused while it was published', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    rowsAnswer(
      { state: 'ready', included: true },
      { state: 'ready', included: true, result: 'refused', resultReason: 'cost_moved' },
    );
    await openSwitches('Z3X');
    await pressSwitch(user, Z3X);
    expect(
      await screen.findByText(`${Z3X} was not put on the shop`, undefined, { timeout: 15_000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/the cost changed a lot meanwhile\. Open the run to see it\./),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open the run' })).toBeInTheDocument();
    expect(sentTo(requests, 'POST', `/admin/publish-runs/${RUN}/apply`)).toHaveLength(1);
    expect(sentTo(requests, 'POST', `/admin/publish-runs/${RUN}/cancel`)).toHaveLength(0);
  });

  it('says a run still working after the wait is being published, keeps reading, and tells how it ended', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    rowsAnswer({ state: 'ready', included: true }, { state: 'ready', included: true, result: 'published' });
    // The worker is busy: the run stays queued and running past the first wait, then ends.
    runReads('draft', 'queued', 'running', 'running', 'running', 'running', 'succeeded');
    await openSwitches('Z3X');
    const toggle = await pressSwitch(user, Z3X);
    expect(
      await screen.findByText(`${Z3X} is still being published`, undefined, { timeout: 15_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open the run' })).toBeInTheDocument();
    expect(screen.queryByText(`${Z3X} was not put on the shop`)).not.toBeInTheDocument();
    expect(
      await screen.findByText(`${Z3X} is on the shop`, undefined, { timeout: 15_000 }),
    ).toBeInTheDocument();
    // The run was never cancelled, and the row is free again once it ended.
    expect(sentTo(requests, 'POST', `/admin/publish-runs/${RUN}/cancel`)).toHaveLength(0);
    await waitFor(() => expect(toggle).toBeEnabled());
  });

  it('follows the run and does not cancel it when the answer of the apply is lost', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    rowsAnswer({ state: 'ready', included: true }, { state: 'ready', included: true, result: 'published' });
    runReads('draft', 'queued', 'running', 'succeeded');
    // The apply reaches the server but its answer is lost (a dropped connection).
    mockServer.use(http.post('*/admin/publish-runs/:id/apply', () => HttpResponse.error()));
    await openSwitches('Z3X');
    await pressSwitch(user, Z3X);
    expect(
      await screen.findByText(`${Z3X} is on the shop`, undefined, { timeout: 15_000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(`Could not put ${Z3X} on the shop`)).not.toBeInTheDocument();
    expect(sentTo(requests, 'POST', `/admin/publish-runs/${RUN}/cancel`)).toHaveLength(0);
  });

  it('leaves the run alone and offers it when the apply failed and the run is still a draft', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    rowsAnswer({ state: 'ready', included: true });
    runReads('draft');
    mockServer.use(
      http.post('*/admin/publish-runs/:id/apply', () =>
        problem(502, 'BAD_GATEWAY', 'Bad gateway', 'The server did not answer in time.'),
      ),
    );
    await openSwitches('Z3X');
    await pressSwitch(user, Z3X);
    expect(
      await screen.findByText(`Could not put ${Z3X} on the shop`, undefined, { timeout: 15_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('The server did not answer in time.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open the run' })).toBeInTheDocument();
    // The apply may still be on its way: nothing is cancelled.
    expect(sentTo(requests, 'POST', `/admin/publish-runs/${RUN}/cancel`)).toHaveLength(0);
  });

  it('shows a refused start with the server’s words and makes nothing', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    mockServer.use(
      http.post('*/admin/publish-runs', () =>
        problem(503, 'SHOP_UNAVAILABLE', 'Shop unavailable', 'The shop cannot take new runs right now.'),
      ),
    );
    await openSwitches('Z3X');
    const toggle = await pressSwitch(user, Z3X);
    expect(await screen.findByText(`Could not put ${Z3X} on the shop`)).toBeInTheDocument();
    expect(screen.getByText('The shop cannot take new runs right now.')).toBeInTheDocument();
    expect(requests.sent().some((sent) => sent.url.pathname.endsWith('/apply'))).toBe(false);
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('discards the draft when the apply is refused', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/apply', () =>
        problem(409, 'JOB_ALREADY_RUNNING', 'Already running', 'Another run is publishing.'),
      ),
    );
    await openSwitches('Z3X');
    await pressSwitch(user, Z3X);
    expect(
      await screen.findByText(`Could not put ${Z3X} on the shop`, undefined, { timeout: 15_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Another run is publishing.')).toBeInTheDocument();
    expect(sentTo(requests, 'POST', `/admin/publish-runs/${RUN}/cancel`)).toHaveLength(1);
  });
});
