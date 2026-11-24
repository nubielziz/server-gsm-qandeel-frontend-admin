// Tests for the Data requests view, run through the whole app against the dev mock API: the table with its default (open and in progress, so it
// matches the number on the link), the status menu, the deadline sort and the other sorts kept in the address, a deadline close or past in the
// critical colour, the buttons that move a request along, the note Reject asks for, and the empty and error states. Ports the data requests
// cases of the old customers page's tests.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { mocks } from '../../mocks/index';
import { accountState } from '../../mocks/store';
import { dataRequest } from '../../test/fixtures';
import { installAccountMocks } from '../../test/installAccountMocks';
import { linkTexts, renderAccounts, viewLinks } from '../../pages/test-utils';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const EXPOSE = { 'access-control-expose-headers': 'x-total-count' };
const EMPTY_LIST = () => HttpResponse.json([], { headers: { 'x-total-count': '0', ...EXPOSE } });

const statusMenu = () => screen.getByRole('combobox', { name: 'Status' });
const requestsTable = async () =>
  within(await screen.findByRole('table', { name: 'Data requests' }, { timeout: 10_000 }));

// The row of the table that holds a request number.
async function requestRow(number: string) {
  const row = (await (await requestsTable()).findByText(number)).closest('tr');
  if (!row) throw new Error(`No request row holds "${number}".`);
  return within(row);
}

// The request numbers of the table, top to bottom.
const requestNumbers = async () =>
  (await requestsTable())
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent);

// The text of the last link of the row of views: the Data requests link with its number.
const dataRequestsLink = async () => linkTexts(await viewLinks()).at(-1);

// The seed has one request still to do and it is an erasure, which is closed by anonymizing the account. This adds an export request still to do
// (DSR-33, Emma Dubois, due in twenty days), the kind a row's Done button moves.
async function addOpenExport() {
  const { requests } = await accountState();
  const day = 86_400_000;
  requests.insert({
    id: 33,
    accountId: 104,
    kind: 'export',
    status: 'open',
    requestedAt: new Date(Date.now() - day).toISOString(),
    dueAt: new Date(Date.now() + 20 * day).toISOString(),
    completedAt: null,
    handledBy: null,
    fileId: null,
    createdAt: new Date(Date.now() - day).toISOString(),
  });
}

describe('the table', () => {
  it('lists the open and in progress requests by default, so the table matches the number on the link', async () => {
    await renderAccounts('/accounts?view=requests');
    const open = await requestRow('DSR-32');
    expect(open.getByRole('link', { name: 'Mia Schneider' })).toHaveAttribute('href', '/accounts/116');
    expect(open.getByText('Erasure')).toBeInTheDocument();
    expect(open.getByText('Open')).toBeInTheDocument();
    expect(open.getByText('in 27d')).toBeInTheDocument();
    // The finished export is not waiting, so it is not here; the number on the link is the number of rows.
    expect(await requestNumbers()).toEqual(['DSR-32']);
    expect(statusMenu()).toHaveValue('');
    await waitFor(async () => expect(await dataRequestsLink()).toBe('Data requests (1)'));
    expect(await screen.findByText('Results: 1 - 1 of 1')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows every request for All statuses, nearest deadline first, and keeps the status in the address', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts('/accounts?view=requests');
    await requestRow('DSR-32');
    await user.selectOptions(statusMenu(), 'All statuses');
    await waitFor(() => expect(app.location()).toBe('/accounts?view=requests&request=any'));
    await waitFor(async () => expect(await requestNumbers()).toEqual(['DSR-31', 'DSR-32']));
    const done = await requestRow('DSR-31');
    expect(done.getByRole('link', { name: 'Emma Dubois' })).toHaveAttribute('href', '/accounts/104');
    expect(done.getByText('Export')).toBeInTheDocument();
    expect(done.getByText('Done')).toBeInTheDocument();
    // A finished request has no buttons, and its deadline is not shown as a countdown.
    expect(done.queryByRole('button')).not.toBeInTheDocument();
    expect(done.queryByText(/^in \d/)).not.toBeInTheDocument();
    // The number on the link stays the number of requests still to do.
    expect(await dataRequestsLink()).toBe('Data requests (1)');

    await user.selectOptions(statusMenu(), 'Done');
    await waitFor(() => expect(app.location()).toBe('/accounts?view=requests&request=completed'));
    await waitFor(async () => expect(await requestNumbers()).toEqual(['DSR-31']));
    await user.selectOptions(statusMenu(), 'Open and in progress');
    await waitFor(() => expect(app.location()).toBe('/accounts?view=requests'));
    await waitFor(async () => expect(await requestNumbers()).toEqual(['DSR-32']));
  });

  it('opens on the status named in the address, and says so when no request has it', async () => {
    const user = userEvent.setup();
    await renderAccounts('/accounts?view=requests&request=completed');
    expect(statusMenu()).toHaveValue('completed');
    expect(await requestRow('DSR-31')).toBeTruthy();
    await user.selectOptions(statusMenu(), 'Rejected');
    expect(await screen.findByText('No rejected requests')).toBeInTheDocument();
    expect(screen.getByText(/Choose All statuses to see every request/)).toBeInTheDocument();
    expect(screen.getByText('Results: 0')).toBeInTheDocument();
  });

  it('cleans an address with a status, a sort or a page it does not know, keeping the view', async () => {
    const app = await renderAccounts('/accounts?view=requests&request=archived&sort=name&page=0&q=ann');
    await waitFor(() => expect(app.location()).toBe('/accounts?view=requests'));
    expect(await requestRow('DSR-32')).toBeTruthy();
  });

  it('shows a deadline that is close or past in the critical colour', async () => {
    const day = 86_400_000;
    const iso = (offset: number) => new Date(Date.now() + offset * day).toISOString();
    mockServer.use(
      http.get('*/admin/data-requests', () =>
        HttpResponse.json(
          [
            dataRequest({ id: 40, accountName: 'Late Larry', dueAt: iso(-3) }),
            dataRequest({ id: 41, accountName: 'Soon Sam', dueAt: iso(2) }),
            dataRequest({ id: 42, accountName: 'Calm Cleo', dueAt: iso(20) }),
          ],
          { headers: { 'x-total-count': '3', ...EXPOSE } },
        ),
      ),
    );
    await renderAccounts('/accounts?view=requests');
    expect((await requestRow('DSR-40')).getByText('3d overdue')).toHaveClass('text-crit-fg');
    expect((await requestRow('DSR-41')).getByText('in 2d')).toHaveClass('text-crit-fg');
    expect((await requestRow('DSR-42')).getByText('in 20d')).not.toHaveClass('text-crit-fg');
  });

  it('asks the server for open and in progress requests, nearest deadline first, unless told otherwise', async () => {
    const user = userEvent.setup();
    const urls: URL[] = [];
    mockServer.use(
      http.get('*/admin/data-requests', ({ request }) => {
        urls.push(new URL(request.url));
        return undefined;
      }),
    );
    await renderAccounts('/accounts?view=requests');
    await requestRow('DSR-32');
    const table = await requestsTable();
    expect(table.getByRole('columnheader', { name: /Due/ })).toHaveAttribute('aria-sort', 'ascending');
    // The table call and the link's count call both ask for the same two statuses.
    const asked = urls.filter((url) => url.searchParams.has('_sort'));
    expect(asked.length).toBeGreaterThan(0);
    for (const url of asked) {
      expect(url.searchParams.get('_sort')).toBe('dueAt');
      expect(url.searchParams.get('_order')).toBe('asc');
      expect(url.searchParams.getAll('status')).toEqual(['open', 'in_progress']);
    }
    const counted = urls.filter((url) => !url.searchParams.has('_sort'));
    expect(counted.length).toBeGreaterThan(0);
    for (const url of counted) {
      expect(url.searchParams.get('_end')).toBe('1');
      expect(url.searchParams.getAll('status')).toEqual(['open', 'in_progress']);
    }

    urls.length = 0;
    await user.selectOptions(statusMenu(), 'All statuses');
    await waitFor(() => expect(urls.some((url) => url.searchParams.has('_sort'))).toBe(true));
    expect(urls.find((url) => url.searchParams.has('_sort'))?.searchParams.has('status')).toBe(false);
  });

  it('sorts by a column header and keeps the sort in the address', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts('/accounts?view=requests&request=any');
    await requestRow('DSR-31');
    const table = await requestsTable();
    // The deadline column starts ascending, so one click turns it around; the default sort leaves no key of its own.
    await user.click(table.getByRole('button', { name: 'Due' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?view=requests&dir=desc&request=any'));
    await waitFor(async () => expect(await requestNumbers()).toEqual(['DSR-32', 'DSR-31']));
    await user.click(table.getByRole('button', { name: 'Received' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?view=requests&sort=requestedAt&request=any'));
    expect(table.getByRole('columnheader', { name: /Received/ })).toHaveAttribute('aria-sort', 'ascending');
  });

  it('goes back to the last page when the address names a page past the end', async () => {
    const app = await renderAccounts('/accounts?view=requests&request=any&page=9');
    await waitFor(() => expect(app.location()).toBe('/accounts?view=requests&request=any'));
    expect(await requestRow('DSR-31')).toBeTruthy();
  });

  it('shows the server’s error with a Retry button when the requests cannot load', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/data-requests', () =>
        problem(503, 'UNAVAILABLE', 'Service unavailable', 'Try again soon.'),
      ),
    );
    await renderAccounts('/accounts?view=requests');
    // A 5xx answer is read again once, after a pause, before the error shows.
    expect(
      await screen.findByText('Could not load the data requests', {}, { timeout: 8_000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText('mock-req-', { exact: false })).toBeInTheDocument();
    mockServer.resetHandlers();
    mockServer.use(...mocks.handlers);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await requestRow('DSR-32')).toBeTruthy();
  });

  it('says so when there are no requests, in the words of the open filter or of all', async () => {
    const user = userEvent.setup();
    mockServer.use(http.get('*/admin/data-requests', EMPTY_LIST));
    await renderAccounts('/accounts?view=requests');
    expect(await screen.findByText('No open or in progress requests')).toBeInTheDocument();
    expect(screen.getByText(/Choose All statuses to see every request/)).toBeInTheDocument();
    await user.selectOptions(statusMenu(), 'All statuses');
    expect(await screen.findByText('No requests yet')).toBeInTheDocument();
    expect(screen.getByText(/People ask for a copy of their data/)).toBeInTheDocument();
  });
});

describe('moving a request along', () => {
  it('marks an export request in progress, then done, which takes it off the default view', async () => {
    const user = userEvent.setup();
    await addOpenExport();
    await renderAccounts('/accounts?view=requests');
    const row = await requestRow('DSR-33');
    await user.click(row.getByRole('button', { name: 'Mark in progress' }));
    expect(await screen.findByText('DSR-33 is in progress')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await requestRow('DSR-33')).getByText('In progress')).toBeInTheDocument(),
    );
    // Once it is being worked on, "Mark in progress" is gone and Done is left; it still counts as waiting.
    const working = await requestRow('DSR-33');
    expect(working.queryByRole('button', { name: 'Mark in progress' })).not.toBeInTheDocument();
    expect(await dataRequestsLink()).toBe('Data requests (2)');
    await user.click(working.getByRole('button', { name: 'Done' }));
    expect(await screen.findByText('DSR-33 is done')).toBeInTheDocument();
    // Done is not waiting any more: the row leaves the default view and the link counts what is left.
    await waitFor(async () => expect(await requestNumbers()).toEqual(['DSR-32']));
    await waitFor(async () => expect(await dataRequestsLink()).toBe('Data requests (1)'));
    await user.selectOptions(statusMenu(), 'Done');
    await waitFor(async () => expect(await requestNumbers()).toEqual(['DSR-31', 'DSR-33']));
    expect((await requestRow('DSR-33')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers Anonymize… in place of Done for an erasure, since the server closes an erasure only when the account is anonymized', async () => {
    const patches: string[] = [];
    mockServer.use(
      http.patch('*/admin/data-requests/:id', ({ request }) => {
        patches.push(request.url);
        return undefined;
      }),
    );
    await renderAccounts('/accounts?view=requests');
    const erasure = await requestRow('DSR-32');
    expect(erasure.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
    expect(erasure.getByRole('link', { name: 'Anonymize…' })).toHaveAttribute(
      'href',
      '/accounts/116?tab=privacy',
    );
    // The other two buttons stay: an erasure can still be taken up or refused.
    expect(erasure.getByRole('button', { name: 'Mark in progress' })).toBeInTheDocument();
    expect(erasure.getByRole('button', { name: 'Reject…' })).toBeInTheDocument();
    expect(patches).toEqual([]);
  });

  it('still offers Done for an export request, which has nothing to anonymize', async () => {
    await addOpenExport();
    await renderAccounts('/accounts?view=requests');
    const exported = await requestRow('DSR-33');
    expect(exported.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(exported.queryByRole('link', { name: 'Anonymize…' })).not.toBeInTheDocument();
  });

  it('rejects a request with a note, which the dialog asks for', async () => {
    const user = userEvent.setup();
    await renderAccounts('/accounts?view=requests');
    await user.click((await requestRow('DSR-32')).getByRole('button', { name: 'Reject…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reject DSR-32?' });
    expect(within(dialog).getByText('Mia Schneider’s erasure request.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Reject request' }));
    expect(await within(dialog).findByText('Say why the request is refused.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Note'), 'We could not verify who asked');
    await user.click(within(dialog).getByRole('button', { name: 'Reject request' }));
    expect(await screen.findByText('DSR-32 was rejected')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('DSR-32')).not.toBeInTheDocument());
    await user.selectOptions(statusMenu(), 'Rejected');
    expect((await requestRow('DSR-32')).getByText('Rejected')).toBeInTheDocument();
  });

  it('sends the note with the rejection, and shows the server’s refusal in the dialog', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    mockServer.use(
      http.patch('*/admin/data-requests/:id', async ({ request }) => {
        bodies.push(await request.json());
        return problem(409, 'REQUEST_CLOSED', 'Request already closed', 'Someone closed it a moment ago.');
      }),
    );
    await renderAccounts('/accounts?view=requests');
    await user.click((await requestRow('DSR-32')).getByRole('button', { name: 'Reject…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reject DSR-32?' });
    await user.type(within(dialog).getByLabelText('Note'), 'Duplicate of DSR-30');
    await user.click(within(dialog).getByRole('button', { name: 'Reject request' }));
    expect(await within(dialog).findByText('Someone closed it a moment ago.')).toBeInTheDocument();
    expect(bodies).toEqual([{ status: 'rejected', note: 'Duplicate of DSR-30' }]);
    expect(screen.getByRole('dialog', { name: 'Reject DSR-32?' })).toBeInTheDocument();
    // The refusal is the dialog's: there is no toast for it.
    expect(screen.queryByText('Request already closed')).not.toBeInTheDocument();
  });

  it('shows a refusal of a row button as a toast', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/data-requests/:id', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'You may not change data requests.'),
      ),
    );
    await addOpenExport();
    await renderAccounts('/accounts?view=requests');
    await user.click((await requestRow('DSR-33')).getByRole('button', { name: 'Done' }));
    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
    expect(screen.getByText(/You may not change data requests/)).toBeInTheDocument();
  });

  it('turns off the buttons of the row whose change is running, so it cannot be sent twice', async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    mockServer.use(
      http.patch('*/admin/data-requests/:id', async () => {
        calls += 1;
        await gate;
        return undefined;
      }),
    );
    await addOpenExport();
    await renderAccounts('/accounts?view=requests');
    const row = await requestRow('DSR-33');
    await user.click(row.getByRole('button', { name: 'Done' }));
    await waitFor(async () =>
      expect((await requestRow('DSR-33')).getByRole('button', { name: 'Done' })).toBeDisabled(),
    );
    const busy = await requestRow('DSR-33');
    expect(busy.getByRole('button', { name: 'Reject…' })).toBeDisabled();
    expect(busy.getByRole('button', { name: 'Mark in progress' })).toBeDisabled();
    release();
    await waitFor(() => expect(calls).toBe(1));
  });
});
