// Tests for the Activity Log part of an account's record, run through the whole app. Most tests answer `GET /admin/audit-logs` themselves, so
// each sees the question the part asked the server and the answer it gets: the entries about the account, who did what and from where, the
// footer pager (page and size), the link into the audit log, the empty and error states, and what a role without `audit:read` is never asked
// for. Ports the Audit cases of the old merchant page (adapted: the footer pager replaces "Show more").
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { partsMenu, renderAccount } from '../../pages/test-utils';
import { SEED } from '../../test/apiSupport';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/;

// A page of a stub list: `total` rows exist, the request's `_start` and `_end` pick the page, `make` builds row n.
function listOf<T>(total: number, make: (n: number) => T, seen?: string[]) {
  return ({ request }: { request: Request }) => {
    const params = new URL(request.url).searchParams;
    seen?.push(params.toString());
    const start = Number(params.get('_start') ?? 0);
    const end = Math.min(Number(params.get('_end') ?? total), total);
    const rows = Array.from({ length: Math.max(0, end - start) }, (_, index) => make(start + index + 1));
    return HttpResponse.json(rows, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  };
}

const entry = (n: number) => ({
  id: n,
  actorType: n % 4 === 0 ? 'system' : 'staff',
  actorId: n % 4 === 0 ? null : 2,
  actorName: n % 4 === 0 ? null : 'Lina S.',
  action: n % 2 ? 'edited details of' : 'set a temporary password for',
  entityType: 'account',
  entityId: 1,
  entityLabel: 'Zain Mobile Hub',
  ip: n % 4 === 0 ? null : '198.51.100.77',
  account: { id: 1 },
  createdAt: new Date(Date.UTC(2026, 9, 28, 12, 0) - n * 60_000).toISOString(),
});

const openActivity = (permissions?: string[]) =>
  renderAccount(SEED.ZAIN, ZAIN, { tab: 'audit', ...(permissions ? { permissions } : {}) });
const activityTable = async () => within(await screen.findByRole('table', { name: 'Activity log' }));
const bodyRows = (table: ReturnType<typeof within>) => table.getAllByRole('row').slice(1);

describe('the entries about an account', () => {
  it('lists them with who did what and from where, and asks for them by account, newest first', async () => {
    const calls: string[] = [];
    mockServer.use(http.get('*/admin/audit-logs', listOf(3, entry, calls)));
    await openActivity();
    const table = await activityTable();
    await waitFor(() => expect(bodyRows(table)).toHaveLength(3));
    expect(table.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'When',
      'What',
      'Who',
      'From',
    ]);
    const first = bodyRows(table)[0];
    expect(first).toHaveTextContent('edited details of Zain Mobile Hub');
    expect(first).toHaveTextContent('Lina S.');
    expect(first).toHaveTextContent('198.51.100.77');
    expect(bodyRows(table)[2]).toHaveTextContent('edited details of Zain Mobile Hub');
    const params = new URLSearchParams(calls[0]);
    expect(params.get('accountId')).toBe('1');
    expect(params.has('entityType')).toBe(false);
    expect(params.has('entityId')).toBe(false);
    expect(params.get('_start')).toBe('0');
    expect(params.get('_end')).toBe('25');
    expect(params.get('_sort')).toBe('createdAt');
    expect(params.get('_order')).toBe('desc');
  });

  it('names the system when it made the change, and shows a dash where there is no address', async () => {
    mockServer.use(http.get('*/admin/audit-logs', listOf(4, entry)));
    await openActivity();
    const table = await activityTable();
    await waitFor(() => expect(bodyRows(table)).toHaveLength(4));
    const last = bodyRows(table)[3];
    expect(last).toHaveTextContent('System');
    expect(last).toHaveTextContent('set a temporary password for Zain Mobile Hub');
    expect(within(last as HTMLElement).getByText('–')).toBeInTheDocument();
  });

  it('shows the rows the mock holds about the account, newest first, and none about another account', async () => {
    await renderAccount(SEED.CAIRO, /Cairo GSM Lab/, { tab: 'audit' });
    const table = await activityTable();
    await waitFor(() => expect(bodyRows(table)).toHaveLength(2));
    expect(bodyRows(table)[0]).toHaveTextContent('set client price for Cairo GSM Lab, AT&T USA Premier');
    expect(bodyRows(table)[0]).toHaveTextContent('203.0.113.24');
    expect(bodyRows(table)[1]).toHaveTextContent('changed commission plan of Cairo GSM Lab');
    expect(bodyRows(table)[1]).toHaveTextContent('Rami K.');
  });

  it('shows an old customer row under the account it resolves to, and names the system', async () => {
    await renderAccount(SEED.JACK, /Jack Turner/, { tab: 'audit' });
    const table = await activityTable();
    await waitFor(() => expect(bodyRows(table)).toHaveLength(1));
    expect(bodyRows(table)[0]).toHaveTextContent('blocked customer Jack Turner');
    expect(bodyRows(table)[0]).toHaveTextContent('System');
  });
});

describe('the footer pager', () => {
  it('shows 25 entries and reads the next ones from where the page ended', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    mockServer.use(http.get('*/admin/audit-logs', listOf(30, entry, calls)));
    await openActivity();
    const table = await activityTable();
    await waitFor(() => expect(bodyRows(table)).toHaveLength(25));
    expect(await screen.findByText('Results: 1 - 25 of 30')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Results: 26 - 30 of 30')).toBeInTheDocument();
    await waitFor(() => expect(bodyRows(table)).toHaveLength(5));
    const params = new URLSearchParams(calls.at(-1));
    expect(params.get('_start')).toBe('25');
    expect(params.get('_end')).toBe('50');
  });

  it('goes back to page 1 when the page size changes', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    mockServer.use(http.get('*/admin/audit-logs', listOf(60, entry, calls)));
    await openActivity();
    await screen.findByText('Results: 1 - 25 of 60');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Results: 26 - 50 of 60');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Page size:' }), '50');
    expect(await screen.findByText('Results: 1 - 50 of 60')).toBeInTheDocument();
    const params = new URLSearchParams(calls.at(-1));
    expect(params.get('_start')).toBe('0');
    expect(params.get('_end')).toBe('50');
  });
});

describe('the link into the audit log', () => {
  it('opens the audit log filtered to this account', async () => {
    mockServer.use(http.get('*/admin/audit-logs', listOf(1, entry)));
    await openActivity();
    expect(await screen.findByRole('link', { name: 'Open in the audit log' })).toHaveAttribute(
      'href',
      '/audit?type=account&record=1',
    );
  });
});

describe('the other states', () => {
  it('says nothing was recorded about the account yet', async () => {
    mockServer.use(http.get('*/admin/audit-logs', listOf(0, entry)));
    await openActivity();
    expect(await screen.findByText('Nothing recorded about this account yet')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Activity log' })).not.toBeInTheDocument();
  });

  it('says it too for an account the mock holds no entry about', async () => {
    await openActivity();
    expect(await screen.findByText('Nothing recorded about this account yet')).toBeInTheDocument();
  });

  it('shows an error with Retry, and the entries once a retry succeeds', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/audit-logs', () => HttpResponse.json({ title: 'Broken' }, { status: 400 })),
    );
    await openActivity();
    expect(await screen.findByText('Could not load the activity log')).toBeInTheDocument();
    mockServer.use(http.get('*/admin/audit-logs', listOf(2, entry)));
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    const table = await activityTable();
    await waitFor(() => expect(bodyRows(table)).toHaveLength(2));
    expect(screen.queryByText('Could not load the activity log')).not.toBeInTheDocument();
  });

  it('is left out without audit:read, and the audit log is never asked', async () => {
    const calls: string[] = [];
    mockServer.use(http.get('*/admin/audit-logs', listOf(1, entry, calls)));
    await openActivity(['clients:read']);
    const links = partsMenu()
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(links).not.toContain('Activity Log');
    expect(screen.queryByRole('table', { name: 'Activity log' })).not.toBeInTheDocument();
    expect(calls).toEqual([]);
  });
});
