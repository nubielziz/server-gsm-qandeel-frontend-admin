// Tests for the Search tab, which is the index panel alone: the engine and index figures, a damaged state, the Rebuild index button behind a
// confirmation, the running state read from the status (and refreshed every 5 seconds), the server's refusals, and the
// permissions (storefront:publish rebuilds, storefront:read reads).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { recordRequests } from '../test/requests';
import { READER, openSearch } from '../test/searchTab';
import { dialogOf } from '../test/storefrontPage';
import type { SearchIndexStatus } from '../types';
import { getSearchIndex } from '../api';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const PUBLISHER = ['storefront:read', 'storefront:publish'];

/** The status the mock sends, with some fields changed, for a test that needs another state. It signs in: the read needs a session. */
async function statusWith(change: (status: SearchIndexStatus) => void): Promise<SearchIndexStatus> {
  await signInAs();
  const status = structuredClone(await getSearchIndex());
  change(status);
  return status;
}

describe('the tab', () => {
  it('shows the index alone, with no section switch', async () => {
    await openSearch();
    expect(await screen.findByRole('region', { name: 'Search index figures' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rebuild index…' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Search tools' })).toBeNull();
    for (const retired of ['Synonyms', 'Pinned results', 'Report', 'Test a search']) {
      expect(screen.queryByText(retired)).toBeNull();
    }
  });

  it.each([
    '?tab=search&section=pins&state=on',
    '?tab=search&section=synonyms',
    '?tab=search&section=nonsense',
  ])('shows the index for an old address %s', async (query) => {
    await openSearch({ route: `/storefront${query}` });
    expect(await screen.findByRole('region', { name: 'Search index figures' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rebuild index…' })).toBeInTheDocument();
  });

  it('never asks for the retired routes', async () => {
    const requests = recordRequests();
    await openSearch({ route: '/storefront?tab=search&section=report' });
    await screen.findByRole('region', { name: 'Search index figures' });
    const paths = requests.sent().map((r) => r.url.pathname);
    expect(paths).toContain('/admin/search/index');
    expect(
      paths.filter((path) => path.startsWith('/admin/search') && path !== '/admin/search/index'),
    ).toEqual([]);
  });
});

describe('the status', () => {
  it('shows a healthy engine, a complete index, the last runs and no error', async () => {
    await openSearch();
    const figures = within(await screen.findByRole('region', { name: 'Search index figures' }));
    expect(figures.getByText('Running')).toBeInTheDocument();
    expect(figures.getByText('Typesense 30.2')).toBeInTheDocument();
    expect(figures.getByText('14 of 14')).toBeInTheDocument();
    expect(figures.getByText('in sync with the catalogue')).toBeInTheDocument();
    expect(await screen.findByText('46 MB')).toBeInTheDocument();
    expect(screen.getByText('gsm_services_v1_20261116034000')).toBeInTheDocument();
    expect(screen.getByText('None.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rebuild index…' })).toBeEnabled();
  });

  it('shows an engine that is down, an index with gaps, failed updates and the last error', async () => {
    const sick = await statusWith((status) => {
      status.engine = { status: 'down', version: null, memoryBytes: null };
      status.documents = 11;
      status.failed = 3;
      status.lastRebuildAt = null;
      status.lastError = 'Import of 3 documents failed: field in_stock must be a bool.';
    });
    mockServer.use(http.get('*/admin/search/index', () => HttpResponse.json(sick)));
    await openSearch();
    const figures = within(await screen.findByRole('region', { name: 'Search index figures' }));
    expect(figures.getByText('Not answering')).toBeInTheDocument();
    expect(figures.getByText('11 of 14')).toBeInTheDocument();
    expect(figures.getByText('3 missing from the index')).toBeInTheDocument();
    expect(figures.getByText('3')).toBeInTheDocument();
    expect(
      screen.getByText('Import of 3 documents failed: field in_stock must be a bool.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('explains a disk-full refusal in plain words next to the engine’s own text', async () => {
    const full = await statusWith((status) => {
      status.lastError = 'Rejecting write: running out of resource type: OUT_OF_DISK';
    });
    mockServer.use(http.get('*/admin/search/index', () => HttpResponse.json(full)));
    await openSearch();
    expect(
      await screen.findByText('Rejecting write: running out of resource type: OUT_OF_DISK'),
    ).toBeInTheDocument();
    expect(screen.getByText(/disk is nearly full/)).toBeInTheDocument();
  });

  it('says so when the engine is switched off, and keeps Rebuild index unavailable', async () => {
    const off = await statusWith((status) => {
      status.engine = { status: 'disabled', version: null, memoryBytes: null };
    });
    mockServer.use(http.get('*/admin/search/index', () => HttpResponse.json(off)));
    await openSearch();
    expect(await screen.findByText('Switched off')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Rebuild index…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Search is switched off in this environment');
  });
});

describe('Rebuild index', () => {
  it('asks first, says what happens, starts the rebuild and shows it running', async () => {
    const user = userEvent.setup();
    await openSearch();
    await user.click(await screen.findByRole('button', { name: 'Rebuild index…' }));
    const dialog = dialogOf('Rebuild the search index?');
    expect(dialog.getByText(/Search keeps working while it builds/)).toBeInTheDocument();
    expect(dialog.getByText(/audit log records who started it/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    const requests = recordRequests();
    await user.click(screen.getByRole('button', { name: 'Rebuild index…' }));
    await user.click(dialogOf('Rebuild the search index?').getByRole('button', { name: 'Rebuild index' }));
    expect(await screen.findByText('Rebuild started')).toBeInTheDocument();
    expect(
      requests.sent().some((r) => r.method === 'POST' && r.url.pathname === '/admin/search/index/rebuild'),
    ).toBe(true);
    expect(await screen.findByText(/Rebuild running since/)).toBeInTheDocument();
    const running = screen.getByRole('button', { name: /Rebuilding/ });
    expect(running).toBeDisabled();
  });

  it('shows the running state the status says, with no button to start another', async () => {
    const busy = await statusWith((status) => {
      status.rebuild = { running: true, startedAt: new Date().toISOString() };
    });
    mockServer.use(http.get('*/admin/search/index', () => HttpResponse.json(busy)));
    await openSearch();
    expect(await screen.findByText(/Rebuild running since/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rebuilding/ })).toBeDisabled();
  });

  it('shows the server’s refusal in the dialog and reads the status again', async () => {
    mockServer.use(
      http.post('*/admin/search/index/rebuild', () =>
        problem(
          409,
          'JOB_ALREADY_RUNNING',
          'Rebuild already running',
          'A rebuild of the search index is already running.',
        ),
      ),
    );
    const user = userEvent.setup();
    await openSearch();
    await user.click(await screen.findByRole('button', { name: 'Rebuild index…' }));
    await user.click(dialogOf('Rebuild the search index?').getByRole('button', { name: 'Rebuild index' }));
    expect(
      await dialogOf('Rebuild the search index?').findByText(
        'A rebuild of the search index is already running.',
      ),
    ).toBeInTheDocument();
  });

  it('shows UNAVAILABLE in the dialog while the engine does not answer', async () => {
    mockServer.use(
      http.post('*/admin/search/index/rebuild', () =>
        problem(503, 'UNAVAILABLE', 'Search engine unavailable', 'The search engine is not answering.'),
      ),
    );
    const user = userEvent.setup();
    await openSearch();
    await user.click(await screen.findByRole('button', { name: 'Rebuild index…' }));
    await user.click(dialogOf('Rebuild the search index?').getByRole('button', { name: 'Rebuild index' }));
    expect(
      await dialogOf('Rebuild the search index?').findByText('The search engine is not answering.'),
    ).toBeInTheDocument();
  });
});

describe('the running state is read every 5 seconds', () => {
  it('refreshes the status while a rebuild runs and stops when it is over', async () => {
    let reads = 0;
    const base = await statusWith(() => {});
    mockServer.use(
      http.get('*/admin/search/index', () => {
        reads += 1;
        const running = reads < 3;
        return HttpResponse.json({
          ...base,
          rebuild: { running, startedAt: running ? new Date().toISOString() : null },
        });
      }),
    );
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'], shouldAdvanceTime: false });
    await openSearch();
    expect(await screen.findByText(/Rebuild running since/)).toBeInTheDocument();
    expect(reads).toBe(1);
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(reads).toBe(2));
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(reads).toBe(3));
    await waitFor(() => expect(screen.queryByText(/Rebuild running since/)).toBeNull());
    expect(screen.getByRole('button', { name: 'Rebuild index…' })).toBeEnabled();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(reads).toBe(3);
  });
});

describe('permissions', () => {
  it('lets a reader see the status but not rebuild, and names the permission', async () => {
    await openSearch({ permissions: READER });
    const button = await screen.findByRole('button', { name: 'Rebuild index…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the storefront:publish permission');
    expect(await screen.findByText('14 of 14')).toBeInTheDocument();
  });

  it('lets storefront:publish rebuild', async () => {
    await openSearch({ permissions: PUBLISHER });
    expect(await screen.findByRole('button', { name: 'Rebuild index…' })).toBeEnabled();
  });
});
