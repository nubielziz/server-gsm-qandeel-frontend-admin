// Tests for "Earlier runs" on the publish view's start: every run newest first with what it took, its status, its counts and who
// started it; a draft says Continue; a link opens the run; the table is paged by the server; and its empty, failed and hidden states.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import type { PublishRun } from '../types';
import { recordRequests } from '../test/requests';
import { lastOf, openPublishStart } from '../test/publishPage';
import { tableNamed } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

const RUNS = 'Publish runs';

/** The cells of the row of a run, found by the link that opens it. */
async function rowOfRun(id: number) {
  const link = await screen.findByRole('link', { name: new RegExp(`^(Open|Continue) run ${id}$`) });
  return within(link.closest('tr')!);
}

describe('the list', () => {
  it('lists the seeded runs newest first, one row each', async () => {
    const requests = recordRequests();
    await openPublishStart();
    const table = await tableNamed(RUNS);
    expect(table.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'When',
      'What',
      'Status',
      'Published / Left out / Refused',
      'By',
      'Actions',
    ]);
    const links = table.getAllByRole('link').map((link) => link.getAttribute('aria-label'));
    expect(links).toEqual([
      'Open run 7',
      'Open run 6',
      'Continue run 5',
      'Open run 4',
      'Open run 3',
      'Open run 2',
      'Open run 1',
    ]);
    const asked = lastOf(requests, 'GET', /\/admin\/publish-runs$/).url.searchParams;
    expect([asked.get('_start'), asked.get('_end'), asked.get('_sort'), asked.get('_order')]).toEqual([
      '0',
      '25',
      'id',
      'desc',
    ]);
  });

  it('draws how a run ended as a square and a word, not as a badge', async () => {
    await openPublishStart();
    const done = (await rowOfRun(1)).getByText('Done');
    expect(done.closest('.badge')).toBeNull();
    expect(done.previousElementSibling).toHaveClass('status-sq', 'status-sq-ok');
    expect((await rowOfRun(3)).getByText('Failed').previousElementSibling).toHaveClass('status-sq-crit');
    expect((await rowOfRun(4)).getByText('Cancelled').previousElementSibling).toHaveClass('status-sq-off');
    expect((await rowOfRun(5)).getByText('Draft').previousElementSibling).toHaveClass('status-sq-warn');
  });

  it('ends in the footer pager, in the flow above the pinned bar of the view', async () => {
    await openPublishStart();
    await rowOfRun(1);
    const pager = screen.getByRole('navigation', { name: 'Pagination' });
    expect(pager).toHaveTextContent('Results: 1 - 7 of 7');
    expect(pager.closest('.pager-inline')).not.toBeNull();
    expect(pager.closest('.pinned-bar')).toBeNull();
  });

  it('shows what each run took, how it ended, its three counts and who started it', async () => {
    await openPublishStart();
    const first = await rowOfRun(1);
    expect(first.getByText('Everything not on the shop yet')).toBeInTheDocument();
    expect(first.getByText('Done')).toBeInTheDocument();
    expect(first.getByText('9 / 2 / 1')).toBeInTheDocument();
    expect(first.getByText('Rami K.')).toBeInTheDocument();

    const second = await rowOfRun(2);
    expect(second.getByText('Category 4')).toBeInTheDocument();
    expect(second.getByText('(switched off)')).toBeInTheDocument();
    expect(second.getByText('6 / 0 / 0')).toBeInTheDocument();

    const stalled = await rowOfRun(3);
    expect(stalled.getByText('Failed')).toBeInTheDocument();
    expect(stalled.getByText('4 / 0 / 1')).toBeInTheDocument();

    expect((await rowOfRun(4)).getByText('Cancelled')).toBeInTheDocument();
    const quick = await rowOfRun(7);
    expect(quick.getByText('What Quick add 2 made')).toBeInTheDocument();
    expect(quick.getByText('System')).toBeInTheDocument();
    expect(quick.getByText('5 / 2 / 0')).toBeInTheDocument();
  });

  it('says Continue on a draft, which has no counts yet, and opens a run from its link', async () => {
    const user = userEvent.setup();
    const app = await openPublishStart();
    const draft = await rowOfRun(5);
    expect(draft.getByText('Draft')).toBeInTheDocument();
    expect(draft.getByText('–')).toBeInTheDocument();
    expect(draft.getByRole('link', { name: 'Continue run 5' })).toHaveTextContent('Continue');
    expect(draft.getByRole('link', { name: 'Continue run 5' })).toHaveAttribute(
      'href',
      '/products?view=publish&run=5',
    );
    await user.click((await rowOfRun(1)).getByRole('link', { name: 'Open run 1' }));
    expect(app.location()).toBe('/products?view=publish&run=1');
    expect(await screen.findByRole('heading', { level: 2, name: 'Publish run 1' })).toBeInTheDocument();
  });

  it('sorts by the day it was made on the server', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPublishStart();
    await user.click((await tableNamed(RUNS)).getByRole('button', { name: /When/ }));
    await waitFor(() =>
      expect(lastOf(requests, 'GET', /\/admin\/publish-runs$/).url.searchParams.get('_sort')).toBe(
        'createdAt',
      ),
    );
  });
});

describe('paging, and the states of the table', () => {
  it('pages on the server, 25 runs a page, and keeps the page in the address', async () => {
    const user = userEvent.setup();
    const seed = (await import('../mocks/publishSeed')).buildPublishStores(
      new Map(),
      new Map(),
      [],
      Date.now(),
    );
    const base = seed.runs.find(1)!.run;
    const all = Array.from({ length: 60 }, (_, i): PublishRun => ({ ...base, id: 60 - i }));
    mockServer.use(
      http.get('*/admin/publish-runs', ({ request }) => {
        const params = new URL(request.url).searchParams;
        const page = all.slice(Number(params.get('_start')), Number(params.get('_end')));
        return HttpResponse.json(page, {
          headers: { 'x-total-count': '60', 'access-control-expose-headers': 'x-total-count' },
        });
      }),
    );
    const requests = recordRequests();
    const app = await openPublishStart();
    expect(await screen.findByText('Results: 1 - 25 of 60')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Results: 26 - 50 of 60')).toBeInTheDocument();
    expect(app.location()).toBe('/products?view=publish&page=2');
    const second = lastOf(requests, 'GET', /\/admin\/publish-runs$/).url.searchParams;
    expect([second.get('_start'), second.get('_end')]).toEqual(['25', '50']);
    expect(await screen.findByRole('link', { name: 'Open run 35' })).toBeInTheDocument();
  });

  it('says there are no runs yet', async () => {
    mockServer.use(
      http.get('*/admin/publish-runs', () =>
        HttpResponse.json([], {
          headers: { 'x-total-count': '0', 'access-control-expose-headers': 'x-total-count' },
        }),
      ),
    );
    await openPublishStart();
    expect(await screen.findByText('No runs yet')).toBeInTheDocument();
  });

  it('says it could not load the runs, with Retry', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/publish-runs', () => problem(500, 'INTERNAL', 'Server error', 'The runs failed.')),
    );
    await openPublishStart();
    expect(await screen.findByText('Could not load the earlier runs')).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await rowOfRun(1)).toBeTruthy();
  });

  // A role without storefront:read never reaches this list: the Shop Publish view itself needs that permission (lib/productsViews.tsx).
});
