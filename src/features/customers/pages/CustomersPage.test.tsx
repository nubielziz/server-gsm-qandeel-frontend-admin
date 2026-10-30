// Tests for the customers list, run through the whole app against the dev mock API: the tabs with counts and the header sentence,
// the table's rows, sorting, paging and filters kept in the address, the empty states, the Data requests tab (hidden without
// customers:privacy), and adding a customer by link and with a temporary password.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import {
  customerNames,
  customerRow,
  customersTable,
  listTabs,
  openCustomers,
  requestRow,
  requestsTable,
  tabTexts,
} from '../test/customersPage';
import { customer, dataRequest } from '../test/fixtures';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs
// in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 20_000 });

// A customer's page loads its view as a chunk of its own the first time it opens, which is slow while the whole suite runs.
const SLOW = { timeout: 10_000 };

const EMPTY_LIST = () =>
  HttpResponse.json([], {
    headers: { 'x-total-count': '0', 'access-control-expose-headers': 'x-total-count' },
  });

describe('tabs and counts', () => {
  it('shows the tabs with their counts, and says how many people bought and how many have an account', async () => {
    await openCustomers();
    await waitFor(() =>
      expect(tabTexts()).toEqual([
        'All30',
        'Active28',
        'Flagged3',
        'Suspended1',
        'Blocked1',
        'Data requests1',
      ]),
    );
    expect(
      screen.getByText(
        '30 people have bought on the storefront. 10 have an account, the rest checked out as guests.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the chosen tab in the address and lists only its customers', async () => {
    const user = userEvent.setup();
    const app = await openCustomers();
    await user.click(listTabs().getByRole('tab', { name: /Flagged/ }));
    expect(app.location()).toBe('/customers?tab=flagged');
    await waitFor(async () =>
      expect([...(await customerNames())].sort()).toEqual(['Jack Turner', 'Kevin Doyle', 'Tyler Brooks']),
    );
    await user.click(listTabs().getByRole('tab', { name: /^All/ }));
    expect(app.location()).toBe('/customers');
  });

  it('opens the tab named in the address', async () => {
    await openCustomers('/customers?tab=suspended');
    expect(screen.getByRole('tab', { name: /Suspended/ })).toHaveAttribute('aria-selected', 'true');
    const row = await customerRow('Hannah Weber');
    expect(row.getByText('Suspended')).toBeInTheDocument();
    expect(await customerNames()).toEqual(['Hannah Weber']);
  });

  it('hides the Data requests tab without customers:privacy, and a link to it lands on All', async () => {
    const app = await openCustomers('/customers?tab=requests&status=all&sort=dueAt&dir=asc', {
      permissions: ['customers:read'],
    });
    await waitFor(() =>
      expect(tabTexts()).toEqual(['All30', 'Active28', 'Flagged3', 'Suspended1', 'Blocked1']),
    );
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true');
    expect(await customerRow('Daniel Whitmore')).toBeTruthy();
    // The address is corrected, and the status and sort that only the requests offer are dropped.
    await waitFor(() => expect(app.location()).toBe('/customers'));
    expect(screen.queryByRole('table', { name: 'Data requests' })).not.toBeInTheDocument();
  });

  it('keeps a link to the Data requests tab for staff who may open it', async () => {
    const app = await openCustomers('/customers?tab=requests&status=all&sort=requestedAt&dir=desc');
    expect(await requestRow('DSR-31')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Data requests/ })).toHaveAttribute('aria-selected', 'true');
    expect(app.location()).toBe('/customers?tab=requests&status=all&sort=requestedAt&dir=desc');
  });

  it('keeps the search text and the country in the address when the Data requests tab opens', async () => {
    const user = userEvent.setup();
    const app = await openCustomers('/customers?q=whitmore&country=GB');
    await user.click(listTabs().getByRole('tab', { name: /Data requests/ }));
    expect(app.location()).toBe('/customers?q=whitmore&country=GB&tab=requests');
    expect(await requestRow('DSR-32')).toBeTruthy();
  });
});

describe('the table', () => {
  it('shows a row per customer with the demo’s columns, and links the name to the customer’s page', async () => {
    await openCustomers();
    const daniel = await customerRow('Daniel Whitmore');
    expect(daniel.getByRole('link', { name: 'Daniel Whitmore' })).toHaveAttribute('href', '/customers/1');
    expect(daniel.getByText('daniel.whitmore@mail.example')).toBeInTheDocument();
    expect(daniel.getByText('GB')).toBeInTheDocument();
    expect(daniel.getByText('GBP')).toBeInTheDocument();
    expect(daniel.getByText('Account')).toBeInTheDocument();
    expect(daniel.getByText('$38.37')).toBeInTheDocument();
    expect(daniel.getByText('Low')).toBeInTheDocument();
    expect(daniel.getByText('Active')).toBeInTheDocument();

    const jack = await customerRow('Jack Turner');
    expect(jack.getByText('Guest')).toBeInTheDocument();
    expect(jack.getByText('High')).toBeInTheDocument();
    expect(jack.getByText('Blocked')).toBeInTheDocument();
  });

  it('shows a risk or status it does not know as it is, in a neutral badge, instead of failing', async () => {
    mockServer.use(
      http.get('*/admin/customers', () =>
        HttpResponse.json([customer({ riskLevel: 'med' as never, status: 'pending_review' as never })], {
          headers: { 'x-total-count': '1' },
        }),
      ),
    );
    await openCustomers();
    const row = await customerRow('Daniel Whitmore');
    expect(row.getByText('med').closest('.badge')).toHaveClass('b-neutral');
    expect(row.getByText('pending_review').closest('.badge')).toHaveClass('b-neutral');
  });

  it('shows dashes and "Never" for a customer who has not bought yet', async () => {
    await openCustomers('/customers?q=schneider');
    const mia = await customerRow('Mia Schneider');
    expect(mia.getByText('Never')).toBeInTheDocument();
    expect(mia.getAllByText('–')).toHaveLength(2);
  });

  it('starts with the biggest spender and sorts by a column header, keeping the sort in the address', async () => {
    const user = userEvent.setup();
    const app = await openCustomers();
    const table = await customersTable();
    const spent = (await customerNames())[0];
    expect(table.getByRole('columnheader', { name: /Spent/ })).toHaveAttribute('aria-sort', 'descending');

    await user.click(table.getByRole('button', { name: 'Customer' }));
    expect(app.location()).toBe('/customers?sort=name&dir=asc');
    await waitFor(async () => expect((await customerNames())[0]).toBe('Ana Costa'));
    await user.click(table.getByRole('button', { name: 'Customer' }));
    expect(app.location()).toBe('/customers?sort=name&dir=desc');
    await waitFor(async () => expect((await customerNames())[0]).toBe('Victor Silva'));

    // Clicking Spent twice returns to the default order, so the address is clean again.
    await user.click(table.getByRole('button', { name: 'Spent' }));
    await user.click(table.getByRole('button', { name: 'Spent' }));
    expect(app.location()).toBe('/customers');
    await waitFor(async () => expect((await customerNames())[0]).toBe(spent));
  });

  it('pages 25 at a time and keeps the page in the address', async () => {
    const user = userEvent.setup();
    const app = await openCustomers();
    expect(await screen.findByText('1–25 of 30')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(app.location()).toBe('/customers?page=2');
    expect(await screen.findByText('26–30 of 30')).toBeInTheDocument();
    expect(await customerNames()).toHaveLength(5);
  });

  it('goes back to the last page when the address names a page past the end', async () => {
    const app = await openCustomers('/customers?page=9');
    expect(await screen.findByText('26–30 of 30')).toBeInTheDocument();
    await waitFor(() => expect(app.location()).toBe('/customers?page=2'));
  });

  it('shows the server’s error with a Retry button when the list cannot load', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/customers', () =>
        problem(503, 'UNAVAILABLE', 'Service unavailable', 'Try again soon.'),
      ),
    );
    await openCustomers();
    // A 5xx answer is read again once, after a pause, before the error shows.
    expect(
      await screen.findByText('Could not load the customers', {}, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText('mock-req-', { exact: false })).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await customerRow('Daniel Whitmore')).toBeTruthy();
  });
});

describe('filters', () => {
  it('searches by name or email after a pause, keeps the text in the address and clears it', async () => {
    const user = userEvent.setup();
    const app = await openCustomers();
    await customersTable();
    await user.type(screen.getByRole('searchbox', { name: 'Search name, email' }), 'whitmore');
    await waitFor(() => expect(app.location()).toBe('/customers?q=whitmore'));
    await waitFor(async () => expect(await customerNames()).toEqual(['Daniel Whitmore']));
    expect(screen.getByText('1 customer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/customers');
    expect(screen.getByRole('searchbox', { name: 'Search name, email' })).toHaveValue('');
    await waitFor(() => expect(screen.getByText('30 customers')).toBeInTheDocument());
  });

  it('filters by country and puts it in the address', async () => {
    const user = userEvent.setup();
    const app = await openCustomers();
    await customersTable();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by country' }), 'GB');
    expect(app.location()).toBe('/customers?country=GB');
    await waitFor(async () =>
      expect([...(await customerNames())].sort()).toEqual([
        'Chloe Bennett',
        'Daniel Whitmore',
        'Harry Patel',
        'Jack Turner',
        'Samira Khan',
      ]),
    );
    expect(screen.getByText('5 customers')).toBeInTheDocument();
  });

  it('says nothing matches, with a Clear filters button, when the filters leave no customer', async () => {
    const user = userEvent.setup();
    await openCustomers('/customers?q=nobody-by-that-name');
    expect(await screen.findByText('No customers match')).toBeInTheDocument();
    expect(screen.getByText('Try another search or tab.')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(await customerRow('Daniel Whitmore')).toBeTruthy();
  });

  it('says so, without a dead Clear filters button, when a tab has no customers', async () => {
    mockServer.use(
      http.get('*/admin/customers', ({ request }) =>
        new URL(request.url).searchParams.get('status') === 'blocked' ? EMPTY_LIST() : undefined,
      ),
    );
    await openCustomers('/customers?tab=blocked');
    expect(await screen.findByText('No customers match')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('invites to add the first customer when there are none at all', async () => {
    mockServer.use(http.get('*/admin/customers', EMPTY_LIST));
    await openCustomers();
    expect(await screen.findByText('No customers yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add a customer' })).toBeInTheDocument();
  });
});

describe('data requests tab', () => {
  const statusMenu = () => screen.getByRole('combobox', { name: 'Filter by status' });
  const requestNumbers = async () =>
    (await requestsTable())
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent);

  it('lists the open and in progress requests by default, so the table matches the tab’s count', async () => {
    const app = await openCustomers();
    await userEvent.setup().click(listTabs().getByRole('tab', { name: /Data requests/ }));
    expect(app.location()).toBe('/customers?tab=requests');
    const open = await requestRow('DSR-32');
    expect(open.getByRole('link', { name: 'Mia Schneider' })).toHaveAttribute('href', '/customers/16');
    expect(open.getByText('Erasure')).toBeInTheDocument();
    expect(open.getByText('Open')).toBeInTheDocument();
    expect(open.getByText('in 27d')).toBeInTheDocument();
    // The finished export is not waiting, so it is not here; the count above the table is the tab's count.
    expect(await requestNumbers()).toEqual(['DSR-32']);
    expect(statusMenu()).toHaveValue('');
    expect(screen.getByText('1 request')).toBeInTheDocument();
    await waitFor(() => expect(tabTexts().at(-1)).toBe('Data requests1'));
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows every request for All statuses, nearest deadline first, and keeps the status in the address', async () => {
    const user = userEvent.setup();
    const app = await openCustomers('/customers?tab=requests');
    await requestRow('DSR-32');
    await user.selectOptions(statusMenu(), 'All statuses');
    expect(app.location()).toBe('/customers?tab=requests&status=all');
    await waitFor(async () => expect(await requestNumbers()).toEqual(['DSR-31', 'DSR-32']));
    expect(screen.getByText('2 requests')).toBeInTheDocument();
    const done = await requestRow('DSR-31');
    expect(done.getByRole('link', { name: 'Emma Dubois' })).toBeInTheDocument();
    expect(done.getByText('Data export')).toBeInTheDocument();
    expect(done.getByText('Done')).toBeInTheDocument();
    // A finished request has no buttons, and its deadline is not shown as a countdown.
    expect(done.queryByRole('button')).not.toBeInTheDocument();
    expect(done.queryByText(/^in \d/)).not.toBeInTheDocument();
    // The tab's own count stays the number of requests still to do.
    expect(tabTexts().at(-1)).toBe('Data requests1');

    await user.selectOptions(statusMenu(), 'Done');
    expect(app.location()).toBe('/customers?tab=requests&status=completed');
    await waitFor(async () => expect(await requestNumbers()).toEqual(['DSR-31']));
    await user.selectOptions(statusMenu(), 'Open and in progress');
    expect(app.location()).toBe('/customers?tab=requests');
    await waitFor(async () => expect(await requestNumbers()).toEqual(['DSR-32']));
  });

  it('opens on the status named in the address, and says so when no request has it', async () => {
    const user = userEvent.setup();
    await openCustomers('/customers?tab=requests&status=completed');
    expect(statusMenu()).toHaveValue('completed');
    expect(await requestRow('DSR-31')).toBeTruthy();
    await user.selectOptions(statusMenu(), 'Rejected');
    expect(await screen.findByText('No data requests')).toBeInTheDocument();
    expect(screen.getByText(/Nothing has this status/)).toBeInTheDocument();
    expect(screen.getByText('0 requests')).toBeInTheDocument();
  });

  it('shows a deadline that is close or past in the critical colour', async () => {
    const day = 86_400_000;
    const iso = (offset: number) => new Date(Date.now() + offset * day).toISOString();
    mockServer.use(
      http.get('*/admin/data-requests', () =>
        HttpResponse.json(
          [
            dataRequest({ id: 40, customerName: 'Late Larry', dueAt: iso(-3) }),
            dataRequest({ id: 41, customerName: 'Soon Sam', dueAt: iso(2) }),
            dataRequest({ id: 42, customerName: 'Calm Cleo', dueAt: iso(20) }),
          ],
          { headers: { 'x-total-count': '3' } },
        ),
      ),
    );
    await openCustomers('/customers?tab=requests');
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
    await openCustomers('/customers?tab=requests');
    await requestRow('DSR-32');
    const table = await requestsTable();
    expect(table.getByRole('columnheader', { name: /Due/ })).toHaveAttribute('aria-sort', 'ascending');
    // The table call and the tab's count call both ask for the same two statuses.
    const asked = urls.filter((url) => url.searchParams.has('_sort'));
    expect(asked.length).toBeGreaterThan(0);
    for (const url of asked) {
      expect(url.searchParams.get('_sort')).toBe('dueAt');
      expect(url.searchParams.get('_order')).toBe('asc');
      expect(url.searchParams.getAll('status')).toEqual(['open', 'in_progress']);
    }
    expect(
      urls
        .filter((url) => !url.searchParams.has('_sort'))
        .every((url) => url.searchParams.get('_end') === '1'),
    ).toBe(true);

    urls.length = 0;
    await user.selectOptions(statusMenu(), 'All statuses');
    await waitFor(() => expect(urls.some((url) => url.searchParams.has('_sort'))).toBe(true));
    const all = urls.find((url) => url.searchParams.has('_sort'));
    expect(all?.searchParams.has('status')).toBe(false);
  });

  it('marks a request in progress, then done, which takes it off the default view', async () => {
    const user = userEvent.setup();
    await openCustomers('/customers?tab=requests');
    const row = await requestRow('DSR-32');
    await user.click(row.getByRole('button', { name: 'Mark in progress' }));
    expect(await screen.findByText('DSR-32 is in progress')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await requestRow('DSR-32')).getByText('In progress')).toBeInTheDocument(),
    );
    // Once it is being worked on, "Mark in progress" is gone and Done is left; it still counts as waiting.
    const working = await requestRow('DSR-32');
    expect(working.queryByRole('button', { name: 'Mark in progress' })).not.toBeInTheDocument();
    expect(tabTexts().at(-1)).toBe('Data requests1');
    await user.click(working.getByRole('button', { name: 'Done' }));
    expect(await screen.findByText('DSR-32 is done')).toBeInTheDocument();
    // Done is not waiting any more: the row leaves the default view and the tab counts none.
    await waitFor(() => expect(screen.queryByText('DSR-32')).not.toBeInTheDocument());
    expect(await screen.findByText('No data requests')).toBeInTheDocument();
    await waitFor(() => expect(tabTexts().at(-1)).toBe('Data requests0'));
    await user.selectOptions(statusMenu(), 'Done');
    await waitFor(async () => expect(await requestNumbers()).toEqual(['DSR-31', 'DSR-32']));
    expect((await requestRow('DSR-32')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('rejects a request with a note, which the dialog asks for', async () => {
    const user = userEvent.setup();
    await openCustomers('/customers?tab=requests');
    await user.click((await requestRow('DSR-32')).getByRole('button', { name: 'Reject…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reject DSR-32?' });
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
    await openCustomers('/customers?tab=requests');
    await user.click((await requestRow('DSR-32')).getByRole('button', { name: 'Reject…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reject DSR-32?' });
    await user.type(within(dialog).getByLabelText('Note'), 'Duplicate of DSR-30');
    await user.click(within(dialog).getByRole('button', { name: 'Reject request' }));
    expect(await within(dialog).findByText('Someone closed it a moment ago.')).toBeInTheDocument();
    expect(bodies).toEqual([{ status: 'rejected', note: 'Duplicate of DSR-30' }]);
    expect(screen.getByRole('dialog', { name: 'Reject DSR-32?' })).toBeInTheDocument();
  });

  it('shows a refusal of a row button as a toast', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/data-requests/:id', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'You may not change data requests.'),
      ),
    );
    await openCustomers('/customers?tab=requests');
    await user.click((await requestRow('DSR-32')).getByRole('button', { name: 'Done' }));
    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
    expect(screen.getByText(/You may not change data requests/)).toBeInTheDocument();
  });

  it('sorts by a column header and keeps the sort in the address', async () => {
    const user = userEvent.setup();
    const app = await openCustomers('/customers?tab=requests&status=all');
    await requestRow('DSR-31');
    const table = await requestsTable();
    // The deadline column starts ascending, so one click turns it around.
    await user.click(table.getByRole('button', { name: 'Due' }));
    expect(app.location()).toBe('/customers?tab=requests&status=all&sort=dueAt&dir=desc');
    await waitFor(async () => expect(await requestNumbers()).toEqual(['DSR-32', 'DSR-31']));
    await user.click(table.getByRole('button', { name: 'Received' }));
    expect(app.location()).toBe('/customers?tab=requests&status=all&sort=requestedAt&dir=asc');
  });

  it('says so when there are no requests, in the words of the open filter or of all', async () => {
    const user = userEvent.setup();
    mockServer.use(http.get('*/admin/data-requests', EMPTY_LIST));
    await openCustomers('/customers?tab=requests');
    expect(await screen.findByText('No data requests')).toBeInTheDocument();
    expect(screen.getByText(/Nothing has this status/)).toBeInTheDocument();
    await user.selectOptions(statusMenu(), 'All statuses');
    expect(await screen.findByText(/Customers ask for a copy of their data/)).toBeInTheDocument();
  });
});

describe('adding a customer', () => {
  it('disables Add customer without customers:create, and says which permission', async () => {
    await openCustomers('/customers', { permissions: ['customers:read'] });
    const add = await screen.findByRole('button', { name: 'Add customer' });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('title', 'You need the customers:create permission');
  });

  it('adds a customer by invitation link and opens their Account tab', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    mockServer.use(
      http.post('*/admin/customers', async ({ request }) => {
        bodies.push(await request.clone().json());
        return undefined;
      }),
    );
    const app = await openCustomers();
    await user.click(await screen.findByRole('button', { name: 'Add customer' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a customer' });
    await user.type(within(dialog).getByLabelText('Full name'), 'Pat Example');
    await user.type(within(dialog).getByLabelText('Email'), 'Pat.Example@Mail.example');
    await user.selectOptions(within(dialog).getByLabelText('Country'), 'DE');
    await user.type(within(dialog).getByLabelText('Phone (optional)'), '+49 170 000');
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));

    expect(await screen.findByText('Pat Example added')).toBeInTheDocument();
    expect(
      screen.getByText('An invitation to choose a password was sent to pat.example@mail.example.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        name: 'Pat Example',
        email: 'pat.example@mail.example',
        country: 'DE',
        locale: 'en',
        phone: '+49 170 000',
        password: { mode: 'reset_link' },
      },
    ]);
    expect(await screen.findByRole('heading', { level: 1, name: /Pat Example/ }, SLOW)).toBeInTheDocument();
    expect(app.location()).toBe('/customers/31?tab=account');
    expect(await screen.findByText(/Invite link sent/)).toBeInTheDocument();
  });

  it('shows a temporary password once, then opens the Account tab', async () => {
    const user = userEvent.setup();
    const app = await openCustomers();
    await user.click(await screen.findByRole('button', { name: 'Add customer' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a customer' });
    await user.type(within(dialog).getByLabelText('Full name'), 'Tara Temp');
    await user.type(within(dialog).getByLabelText('Email'), 'tara@mail.example');
    await user.click(within(dialog).getByRole('radio', { name: /Set a temporary password now/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));

    const reveal = await screen.findByRole('dialog', { name: 'Temporary password for Tara Temp' });
    expect(within(reveal).getByText(/^[A-Za-z0-9]{14}$/)).toBeInTheDocument();
    expect(within(reveal).getByRole('button', { name: 'Copy temporary password' })).toBeInTheDocument();
    // Nothing moves until the person has seen it.
    expect(app.location()).toBe('/customers');
    await user.click(within(reveal).getByRole('button', { name: 'Done' }));
    expect(await screen.findByRole('heading', { level: 1, name: /Tara Temp/ }, SLOW)).toBeInTheDocument();
    expect(app.location()).toBe('/customers/31?tab=account');
    expect(await screen.findByText('Temporary, they must change it at next sign-in')).toBeInTheDocument();
  });

  it('checks the form before sending, and puts the server’s "email taken" under the email field', async () => {
    const user = userEvent.setup();
    await openCustomers();
    await user.click(await screen.findByRole('button', { name: 'Add customer' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a customer' });
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));
    expect(await within(dialog).findByText('Enter the customer’s name.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a valid email address.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Full name'), 'Copy Cat');
    await user.type(within(dialog).getByLabelText('Email'), 'daniel.whitmore@mail.example');
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));
    expect(
      await within(dialog).findByText('daniel.whitmore@mail.example already belongs to Daniel Whitmore.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog', { name: 'Add a customer' })).toBeInTheDocument();
  });

  it('closes the form without adding anyone when it is cancelled', async () => {
    const user = userEvent.setup();
    const app = await openCustomers();
    await user.click(await screen.findByRole('button', { name: 'Add customer' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a customer' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Add a customer' })).not.toBeInTheDocument(),
    );
    expect(app.location()).toBe('/customers');
  });
});
