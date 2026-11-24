// Tests for the Accounts page, run through the whole app against the dev mock API: the heading, the strip of populations with its counts, the
// row of views (which a role sees, where an unknown, forbidden or old address lands), the table of the All view with its sorts, pages and
// filters kept in the address, its empty and error states, and what each role is allowed to see. The record has its own tests
// (AccountPage.test.tsx), and the actions of the row menu and the With selected strip theirs (AccountsActions.test.tsx).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { Route } from 'react-router';
import { mockMe, renderApp, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { account, guest, merchantAccount } from '../test/fixtures';
import { installAccountMocks } from '../test/installAccountMocks';
import { AccountsPage } from './AccountsPage';
import {
  accountNames,
  accountRow,
  accountsTable,
  currentLink,
  linkTexts,
  renderAccounts,
  stripTabs,
  viewLinks,
} from './test-utils';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const SLOW = { timeout: 10_000 };
const EXPOSE = { 'access-control-expose-headers': 'x-total-count' };
const listOf =
  (rows: unknown[], total = rows.length) =>
  () =>
    HttpResponse.json(rows, { headers: { 'x-total-count': String(total), ...EXPOSE } });
const EMPTY_LIST = listOf([]);

describe('the frame', () => {
  it('draws the heading, the strip of populations with their counts and the row of views for the Owner', async () => {
    await renderAccounts();
    const strip = await stripTabs();
    await waitFor(() =>
      expect(linkTexts(strip)).toEqual(['All accounts (51)', 'Retail (31)', 'Merchants (20)', 'Guests (21)']),
    );
    expect(currentLink(strip)).toBe('All accounts (51)');
    const views = await viewLinks();
    await waitFor(() =>
      expect(linkTexts(views)).toEqual(['All', '+Add Account', 'Ranks', '+Add Rank', 'Data requests (1)']),
    );
    expect(currentLink(views)).toBe('All');
  });

  it('opens the All view first: the Quick Search box and the table of accounts', async () => {
    await renderAccounts();
    expect(await accountsTable()).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Quick Search' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  it('links each tab of the strip to the All view of its population, and the row to the views', async () => {
    await renderAccounts();
    const strip = await stripTabs();
    expect(strip.getByRole('link', { name: /^Retail/ })).toHaveAttribute('href', '/accounts?chip=retail');
    expect(strip.getByRole('link', { name: /^Merchants/ })).toHaveAttribute(
      'href',
      '/accounts?chip=merchants',
    );
    expect(strip.getByRole('link', { name: /^Guests/ })).toHaveAttribute('href', '/accounts?chip=guests');
    const views = await viewLinks();
    expect(views.getByRole('link', { name: 'Add Account' })).toHaveAttribute('href', '/accounts?view=add');
    expect(views.getByRole('link', { name: 'Ranks' })).toHaveAttribute('href', '/accounts?view=ranks');
    expect(views.getByRole('link', { name: /^Data requests/ })).toHaveAttribute(
      'href',
      '/accounts?view=requests',
    );
  });

  it('holds the heading, the two rows of links and the view in one page frame, the view taking what is left', async () => {
    await renderAccounts();
    const view = await screen.findByRole('region', { name: 'All' });
    const frame = view.parentElement;
    expect(frame).toHaveClass('page-frame');
    expect(frame?.firstElementChild).toContainElement(
      screen.getByRole('heading', { level: 1, name: 'Accounts' }),
    );
    expect(frame?.lastElementChild).toBe(view);
    expect(view).toHaveClass('flex', 'flex-1', 'flex-col');
    await waitFor(() => expect(view.firstElementChild).toHaveClass('view-frame'));
  });

  it('draws no side panel, no chips, no cards: the list is a plain table in the page', async () => {
    await renderAccounts();
    await accountsTable();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(document.querySelector('.panel, .badge')).toBeNull();
  });
});

describe('the strip', () => {
  it('keeps the chosen population in the address and lists only its accounts', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts();
    await accountsTable();
    await user.click((await stripTabs()).getByRole('link', { name: /^Guests/ }));
    await waitFor(() => expect(app.location()).toBe('/accounts?chip=guests'));
    await waitFor(async () => expect(await accountNames()).toHaveLength(21));
    expect(currentLink(await stripTabs())).toBe('Guests (21)');
    expect(await accountNames()).toContain('Sofia Alvarez');
    expect(await accountNames()).not.toContain('Daniel Whitmore');
    await user.click((await stripTabs()).getByRole('link', { name: /^All accounts/ }));
    await waitFor(() => expect(app.location()).toBe('/accounts'));
  });

  it('opens the population named in the address: Merchants lists the merchant ranks only', async () => {
    await renderAccounts('/accounts?chip=merchants');
    expect(currentLink(await stripTabs())).toBe('Merchants (20)');
    await waitFor(async () => expect(await accountNames()).toHaveLength(20));
    expect(await accountNames()).toContain('Accra Devices');
    expect(await accountNames()).not.toContain('Daniel Whitmore');
  });

  it('lists the retail ranks for Retail, guests included, as the counts count them', async () => {
    await renderAccounts('/accounts?chip=retail');
    await waitFor(async () => expect(await accountNames()).toHaveLength(31));
    expect(await accountNames()).toContain('Sofia Alvarez');
  });

  it('goes back to the list as it was left when the same tab is pressed again', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts('/accounts?chip=merchants&q=zain');
    await waitFor(async () => expect(await accountNames()).toEqual(['Zain Mobile Hub']));
    await user.click((await stripTabs()).getByRole('link', { name: /^All accounts/ }));
    await waitFor(() => expect(app.location()).toBe('/accounts'));
    await user.click((await stripTabs()).getByRole('link', { name: /^Merchants/ }));
    await waitFor(() => expect(app.location()).toBe('/accounts?chip=merchants&q=zain'));
  });

  it('raises no tab on the views that are not lists of accounts', async () => {
    await renderAccounts('/accounts?view=ranks');
    expect(currentLink(await stripTabs())).toBeUndefined();
    expect(currentLink(await viewLinks())).toBe('Ranks');
  });

  it('scopes the list only: a filter stays when the population changes through the address', async () => {
    await renderAccounts('/accounts?chip=retail&country=GB');
    await waitFor(async () =>
      expect((await accountNames()).sort()).toEqual(
        [
          'Chloe Bennett',
          'Daniel Whitmore',
          'Harry Patel',
          'Jack Turner',
          'Samira Khan',
          'no.name@mail.example',
        ].sort(),
      ),
    );
  });
});

describe('old and unknown addresses', () => {
  it('opens All with the status filter for the old chips of the suspended and blocked tabs', async () => {
    const app = await renderAccounts('/accounts?chip=suspended');
    await waitFor(() => expect(app.location()).toBe('/accounts?status=suspended'));
    await waitFor(async () =>
      expect((await accountNames()).sort()).toEqual(['Accra Devices', 'Hannah Weber', 'Tunis Fix Point']),
    );
    expect(currentLink(await stripTabs())).toMatch(/^All accounts/);
    const status = screen.getByRole('combobox', { name: 'Status' });
    expect(status).toHaveValue('suspended');
    app.unmount();
    const blocked = await renderAccounts('/accounts?chip=blocked');
    await waitFor(() => expect(blocked.location()).toBe('/accounts?status=blocked'));
    await waitFor(async () => expect(await accountNames()).toEqual(['Jack Turner']));
  });

  it('opens All for an old address of the Flagged tab, keeps the rest of it, and drops the tab that is gone', async () => {
    const app = await renderAccounts('/accounts?tab=flagged&q=whitmore');
    await waitFor(() => expect(app.location()).toBe('/accounts?q=whitmore'));
    expect(currentLink(await stripTabs())).toMatch(/^All accounts/);
    await waitFor(async () => expect(await accountNames()).toEqual(['Daniel Whitmore']));
    expect(screen.getByRole('searchbox', { name: /^Search name, email/ })).toHaveValue('whitmore');
  });

  it('sorts by account for an old address that sorts by the risk level, and shows no risk column', async () => {
    await renderAccounts('/accounts?sort=riskLevel&dir=desc');
    const table = within(await accountsTable());
    expect(table.getByRole('columnheader', { name: /Account/ })).toHaveAttribute('aria-sort', 'ascending');
    expect(table.queryByRole('columnheader', { name: /Risk/ })).not.toBeInTheDocument();
  });

  // The Verification and Pending approval tabs of the old merchants page were retired: a bookmark must still open the list.
  it('opens the list for the retired Verification tab, whatever its old parameters say, and keeps the search', async () => {
    const app = await renderAccounts('/accounts?tab=verification&kycStatus=approved&kyc=1&q=zain');
    expect(currentLink(await stripTabs())).toMatch(/^All accounts/);
    await waitFor(() => expect(app.location()).toBe('/accounts?q=zain'));
    await waitFor(async () => expect(await accountNames()).toEqual(['Zain Mobile Hub']));
    expect(screen.queryByRole('link', { name: /Verification/ })).not.toBeInTheDocument();
  });

  it('opens the list for the retired Pending approval tab and keeps the search', async () => {
    const app = await renderAccounts('/accounts?tab=pending&q=zain&group=3');
    await waitFor(() => expect(app.location()).toBe('/accounts?q=zain'));
    await waitFor(async () => expect(await accountNames()).toEqual(['Zain Mobile Hub']));
    expect(screen.queryByRole('link', { name: /Pending/ })).not.toBeInTheDocument();
  });

  it('replaces an unknown value of the address with the plain one, keeping the rest', async () => {
    const app = await renderAccounts('/accounts?chip=vip&status=pending&sort=password&size=7&q=whitmore');
    await waitFor(() => expect(app.location()).toBe('/accounts?q=whitmore'));
    await waitFor(async () => expect(await accountNames()).toEqual(['Daniel Whitmore']));
  });

  it('replaces an unknown view with the first one', async () => {
    const app = await renderAccounts('/accounts?view=nothing&q=x');
    await waitFor(() => expect(app.location()).toBe('/accounts'));
    expect(await accountsTable()).toBeInTheDocument();
  });

  it('replaces a view the role may not use with the first one it may', async () => {
    const app = await renderAccounts('/accounts?view=ranks', { role: 'reader' });
    await waitFor(() => expect(app.location()).toBe('/accounts'));
    expect(linkTexts(await viewLinks())).toEqual(['All']);
  });

  it('opens the Data requests view for the old chip of the requests tab', async () => {
    const app = await renderAccounts('/accounts?chip=requests');
    await waitFor(() => expect(app.location()).toBe('/accounts?view=requests'));
    expect(await screen.findByRole('region', { name: 'Data requests' })).toBeInTheDocument();
    expect(currentLink(await viewLinks())).toMatch(/^Data requests/);
  });

  it('opens All for the old chip of the requests tab when the role may not use that view', async () => {
    const app = await renderAccounts('/accounts?chip=requests', { role: 'reader' });
    await waitFor(() => expect(app.location()).toBe('/accounts'));
    expect(await accountsTable()).toBeInTheDocument();
  });

  it('moves an address past the last page back to the last page that has rows', async () => {
    const app = await renderAccounts('/accounts?page=9');
    await waitFor(() => expect(app.location()).toBe('/accounts?page=2'));
    await waitFor(async () => expect(await accountNames()).toEqual(['Zain Mobile Hub']));
    expect(await screen.findByText('Results: 51 - 51 of 51')).toBeInTheDocument();
  });
});

describe('the table', () => {
  it('shows a row per account with the account, its rank, status, wallet and orders, and links the name to the record', async () => {
    await renderAccounts();
    const daniel = await accountRow('Daniel Whitmore');
    expect(daniel.getByRole('link', { name: 'Daniel Whitmore' })).toHaveAttribute('href', '/accounts/101');
    expect(daniel.getByText('#101 · daniel.whitmore@mail.example · GB')).toBeInTheDocument();
    expect(daniel.getByText('Storefront retail')).toBeInTheDocument();
    expect(daniel.getByText('Active')).toBeInTheDocument();
    expect(daniel.getByText('$50.00')).toBeInTheDocument();
    expect(daniel.getByRole('link', { name: 'Open Daniel Whitmore' })).toHaveAttribute(
      'href',
      '/accounts/101',
    );
    expect(daniel.getByRole('button', { name: 'More actions for Daniel Whitmore' })).toBeInTheDocument();
  });

  it('shows a merchant with its country, email, rank, status, wallet, what is held and the 30-day spend', async () => {
    await renderAccounts('/accounts?q=zain');
    const row = await accountRow('Zain Mobile Hub');
    expect(row.getByRole('link', { name: 'Zain Mobile Hub' })).toHaveAttribute('href', '/accounts/1');
    expect(row.getByText('#1 · ops@zainmobilehub.example · JO')).toBeInTheDocument();
    expect(row.getByText('VIP')).toBeInTheDocument();
    expect(row.getByText('8% off')).toBeInTheDocument();
    expect(row.getByText('Active')).toBeInTheDocument();
    expect(row.getByText('$1,209.75')).toBeInTheDocument();
    expect(row.getByText('$71 held')).toBeInTheDocument();
    expect(row.queryByRole('button', { name: /Approve|Activate/ })).not.toBeInTheDocument();
  });

  it('shows the 30-day spend in whole dollars, and a dash for an account with no order in the window', async () => {
    const stats = (orders: number, spend: string) => ({
      orders,
      spend,
      profit: '0.0000',
      margin: null,
      successRate: null,
      lastOrderAt: null,
    });
    mockServer.use(
      http.get(
        '*/admin/clients',
        listOf([
          account({ id: 1, name: 'Spends', stats: stats(3, '1234.5000') }),
          account({ id: 2, name: 'Quiet', stats: stats(0, '0.0000') }),
          account({ id: 3, name: 'Unread', stats: undefined }),
        ]),
      ),
    );
    await renderAccounts();
    expect((await accountRow('Spends')).getByText('$1,235')).toBeInTheDocument();
    expect((await accountRow('Quiet')).queryByText('$0')).not.toBeInTheDocument();
    expect((await accountRow('Quiet')).getAllByText('–').length).toBeGreaterThan(0);
  });

  it('draws the columns of the layout, with the sorts the server offers', async () => {
    await renderAccounts();
    const table = within(await accountsTable());
    expect(table.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      '',
      'Account',
      'Rank',
      'Status',
      'Wallet',
      'Spent 30 d',
      'Orders',
      'Last order',
      'Actions',
    ]);
  });

  it('shows the merchant rank, the held amount and the credit limit under the balance', async () => {
    await renderAccounts('/accounts?q=Tunis');
    const row = await accountRow('Tunis Fix Point');
    expect(row.getByText('Standard')).toBeInTheDocument();
    expect(row.getByText('Suspended')).toBeInTheDocument();
    expect(row.getByText('$20.18')).toBeInTheDocument();
    expect(row.getByText('$2 held')).toBeInTheDocument();
  });

  it('shows the former pending merchant as suspended, with its credit limit, and no approval button', async () => {
    await renderAccounts('/accounts?q=Accra');
    const row = await accountRow('Accra Devices');
    expect(row.getByText('Suspended')).toBeInTheDocument();
    expect(row.queryByRole('button', { name: /Approve|Activate/ })).not.toBeInTheDocument();
  });

  it('marks a wallet below zero in the critical colour with an alert', async () => {
    await renderAccounts("/accounts?q=Sana'a");
    const row = await accountRow("Sana'a Repair");
    expect(row.getByText('-$81.95')).toHaveClass('text-crit-fg');
  });

  it('marks a merchant invited by staff who has not chosen a password yet, and one that never ordered', async () => {
    await renderAccounts('/accounts?q=algiers');
    const invited = await accountRow('Algiers Service Plus');
    expect(invited.getByText('Invitation pending')).toBeInTheDocument();
    expect(invited.getByText('credit $300')).toBeInTheDocument();
    expect(invited.getByText('Never')).toBeInTheDocument();
  });

  it('shows dashes and "Never" for an account that has not bought yet, and a dash for a guest wallet', async () => {
    await renderAccounts('/accounts?q=alvarez');
    const sofia = await accountRow('Sofia Alvarez');
    expect(sofia.getByText('Guest')).toBeInTheDocument();
    expect(sofia.getByText('Never')).toBeInTheDocument();
    expect(sofia.getAllByText('–').length).toBeGreaterThanOrEqual(3);
  });

  it('names an account with no name by its email, as a link to its record, and does not print the email twice', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts('/accounts?q=no.name');
    const row = await accountRow('no.name@mail.example');
    const link = row.getByRole('link', { name: 'no.name@mail.example' });
    expect(link).toHaveAttribute('href', '/accounts/131');
    expect(row.getAllByText(/no\.name@mail\.example/)).toHaveLength(1);
    expect(row.getByText('#131 · Guest · GB')).toBeInTheDocument();
    await user.click(link);
    await waitFor(() => expect(app.location()).toBe('/accounts/131'));
  });

  it('shows an account that was anonymized as "Deleted account", with what is left of it', async () => {
    mockServer.use(
      http.get(
        '*/admin/clients',
        listOf([account({ id: 12, status: 'anonymized', name: '', email: '', country: '' })]),
      ),
    );
    await renderAccounts();
    const row = await accountRow('Deleted account');
    expect(row.getByText('#12 · Removed')).toBeInTheDocument();
    expect(row.getByText('Anonymized')).toBeInTheDocument();
  });

  it('shows a status it does not know as it is, with a hollow square, instead of failing', async () => {
    mockServer.use(http.get('*/admin/clients', listOf([account({ status: 'pending_review' as never })])));
    await renderAccounts();
    const row = await accountRow('Daniel Whitmore');
    expect(row.getByText('pending_review')).toBeInTheDocument();
    expect(row.getByRole('img', { name: 'pending_review' })).toHaveClass('status-sq-off');
  });

  it('shows the discount of a merchant rank under its name, and no risk, whatever an older server still sends', async () => {
    mockServer.use(
      http.get('*/admin/clients', listOf([{ ...merchantAccount(), riskLevel: 'high' }, guest({ id: 3 })])),
    );
    await renderAccounts();
    const row = await accountRow('Zain Mobile Hub');
    expect(row.getByText('VIP')).toBeInTheDocument();
    expect(row.getByText('8% off')).toBeInTheDocument();
    expect(row.queryByText('High')).not.toBeInTheDocument();
    expect(
      within(await accountsTable()).queryByRole('columnheader', { name: /Risk/ }),
    ).not.toBeInTheDocument();
  });

  it('starts with the accounts A to Z and sorts on the server when a header is pressed, keeping the sort in the address', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts();
    const table = within(await accountsTable());
    expect(table.getByRole('columnheader', { name: /Account/ })).toHaveAttribute('aria-sort', 'ascending');
    await waitFor(async () => expect((await accountNames())[1]).toBe('Accra Devices'));
    await user.click(table.getByRole('button', { name: 'Account' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?dir=desc'));
    await waitFor(async () => expect((await accountNames())[0]).toBe('Zain Mobile Hub'));
    await user.click(table.getByRole('button', { name: 'Status' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?sort=status'));
    await user.click(table.getByRole('button', { name: 'Status' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?sort=status&dir=desc'));
    await user.click(table.getByRole('button', { name: 'Wallet' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?sort=balance'));
    await user.click(table.getByRole('button', { name: 'Orders' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?sort=ordersCount'));
  });

  it('goes to the first page when a header is pressed', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts('/accounts?size=25&page=2');
    await waitFor(async () => expect(await accountNames()).toHaveLength(25));
    await user.click(within(await accountsTable()).getByRole('button', { name: 'Rank' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?sort=rank&size=25'));
  });

  it('leaves the wallet and the 30-day spend out, and the balance sort, for a role that may not read wallets', async () => {
    const app = await renderAccounts('/accounts?sort=balance', { role: 'noWallet' });
    await waitFor(() => expect(app.location()).toBe('/accounts'));
    const table = within(await accountsTable());
    expect(table.queryByRole('columnheader', { name: 'Wallet' })).not.toBeInTheDocument();
    expect(table.queryByRole('columnheader', { name: /Spent/ })).not.toBeInTheDocument();
    expect(table.getByRole('columnheader', { name: /Account/ })).toHaveAttribute('aria-sort', 'ascending');
    expect((await accountRow('Daniel Whitmore')).queryByText('$50.00')).not.toBeInTheDocument();
  });

  it('pages 50 at a time, offers the sizes, and keeps the page and the size in the address', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts();
    expect(await screen.findByText('Results: 1 - 50 of 51')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?page=2'));
    expect(await screen.findByText('Results: 51 - 51 of 51')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Page size:' }), '25');
    await waitFor(() => expect(app.location()).toBe('/accounts?size=25'));
    expect(await screen.findByText('Results: 1 - 25 of 51')).toBeInTheDocument();
    expect(
      within(screen.getByRole('combobox', { name: 'Page size:' }))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['25', '50', '100', '200']);
  });

  it('shows the server’s error with a Retry button when the list cannot load', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/clients', () =>
        problem(503, 'UNAVAILABLE', 'Service unavailable', 'Try again soon.'),
      ),
    );
    await renderAccounts();
    // A 5xx answer is read again once, after a pause, before the error shows.
    expect(
      await screen.findByText('Could not load the accounts', {}, { timeout: 8_000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText('mock-req-', { exact: false })).toBeInTheDocument();
    // The strip still shows its counts: a failing list does not block them.
    expect(linkTexts(await stripTabs())[0]).toBe('All accounts (51)');
    mockServer.resetHandlers();
    mockServer.use(...(await import('../mocks/index')).mocks.handlers);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await accountRow('Daniel Whitmore')).toBeTruthy();
  });

  it('leaves the numbers out of the strip while the counts fail, and keeps the table', async () => {
    mockServer.use(http.get('*/admin/clients/counts', () => problem(500, 'BOOM', 'Server error', 'Nope.')));
    await renderAccounts();
    expect(await accountRow('Daniel Whitmore')).toBeTruthy();
    expect(linkTexts(await stripTabs())).toEqual(['All accounts', 'Retail', 'Merchants', 'Guests']);
  });
});

describe('the Quick Search box', () => {
  it('searches by name, email, company or username, keeps the text in the address and clears it', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts();
    await accountsTable();
    const box = screen.getByRole('searchbox', { name: 'Search name, email, company or username' });
    await user.type(box, 'whitmore');
    // The text is a draft until Search or Enter: the address does not move at each key.
    expect(app.location()).toBe('/accounts');
    await user.click(
      within(screen.getByRole('group', { name: 'Quick Search' })).getByRole('button', { name: 'Search' }),
    );
    await waitFor(() => expect(app.location()).toBe('/accounts?q=whitmore'));
    await waitFor(async () => expect(await accountNames()).toEqual(['Daniel Whitmore']));
    await user.clear(box);
    await user.type(box, 'karachi{Enter}');
    await waitFor(() => expect(app.location()).toBe('/accounts?q=karachi'));
    await waitFor(async () => expect(await accountNames()).toEqual(['Karachi Unlock Hub']));
  });

  it('applies the typed text together with a menu, at once', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts();
    await accountsTable();
    await user.type(screen.getByRole('searchbox', { name: /^Search name/ }), 'a');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Country' }), 'GB');
    await waitFor(() => expect(app.location()).toBe('/accounts?country=GB&q=a'));
  });

  it('filters by country, by status and by rank, each kept in the address and starting again at page 1', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts('/accounts?page=2');
    await waitFor(async () => expect(await accountNames()).toHaveLength(1));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Country' }), 'GB');
    await waitFor(() => expect(app.location()).toBe('/accounts?country=GB'));
    await waitFor(async () => expect(await accountNames()).toHaveLength(6));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'blocked');
    await waitFor(() => expect(app.location()).toBe('/accounts?status=blocked&country=GB'));
    await waitFor(async () => expect(await accountNames()).toEqual(['Jack Turner']));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), '');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Country' }), '');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Rank' }), 'VIP (3)');
    await waitFor(() => expect(app.location()).toBe('/accounts?rank=3'));
    await waitFor(async () =>
      expect((await accountNames()).sort()).toEqual(['Cairo GSM Lab', 'Phone Doctor FZE', 'Zain Mobile Hub']),
    );
  });

  it('writes the status menu with the counts of the exceptions', async () => {
    await renderAccounts();
    const menu = screen.getByRole('combobox', { name: 'Status' });
    await waitFor(() =>
      expect(
        within(menu)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual([
        'Any status',
        'Active',
        'Suspended (3)',
        'Blocked (1)',
        'Anonymized (0)',
        'Invitation pending (1)',
      ]),
    );
  });

  it('filters by Invitation pending: kept in the address, asked of the server as its own flag, never as a status', async () => {
    const user = userEvent.setup();
    const asked: URLSearchParams[] = [];
    mockServer.use(
      http.get('*/admin/clients', ({ request }) => {
        asked.push(new URL(request.url).searchParams);
        return undefined;
      }),
    );
    const app = await renderAccounts();
    await accountsTable();
    await waitFor(() =>
      expect(
        within(screen.getByRole('combobox', { name: 'Status' })).getByRole('option', {
          name: 'Invitation pending (1)',
        }),
      ).toBeInTheDocument(),
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'invitation');
    await waitFor(() => expect(app.location()).toBe('/accounts?status=invitation'));
    await waitFor(async () => expect(await accountNames()).toEqual(['Algiers Service Plus']));
    const filtered = asked.filter((query) => query.has('invitationPending'));
    expect(filtered.length).toBeGreaterThan(0);
    for (const query of filtered) {
      expect(query.get('invitationPending')).toBe('true');
      expect(query.has('status')).toBe(false);
    }
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('invitation');
  });

  it('opens the list on Invitation pending from an address that names it', async () => {
    await renderAccounts('/accounts?status=invitation');
    await waitFor(async () => expect(await accountNames()).toEqual(['Algiers Service Plus']));
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('invitation');
  });

  it('lists the ranks of the population on the strip, each with its accounts, the retail rank first', async () => {
    await renderAccounts();
    const menu = screen.getByRole('combobox', { name: 'Rank' });
    await waitFor(() =>
      expect(
        within(menu)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual(['All ranks', 'Storefront retail (31)', 'Standard (11)', 'Wholesale (6)', 'VIP (3)']),
    );
  });

  it.each([
    ['/accounts?chip=merchants', ['All ranks', 'Standard (11)', 'Wholesale (6)', 'VIP (3)']],
    ['/accounts?chip=retail', ['All ranks', 'Storefront retail (31)']],
    ['/accounts?chip=guests', ['All ranks', 'Storefront retail (31)']],
  ])('narrows the rank menu to the population of %s', async (address, expected) => {
    await renderAccounts(address);
    const menu = screen.getByRole('combobox', { name: 'Rank' });
    await waitFor(() =>
      expect(
        within(menu)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual(expected),
    );
  });

  it('keeps a rank and a country of the address that the lists lack selectable, so a filter is never out of sight', async () => {
    await renderAccounts('/accounts?rank=99&country=PL');
    expect(screen.getByRole('combobox', { name: 'Rank' })).toHaveValue('99');
    expect(
      within(screen.getByRole('combobox', { name: 'Rank' })).getByRole('option', { name: 'Rank #99' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('PL');
    expect(
      within(screen.getByRole('combobox', { name: 'Country' })).getByRole('option', { name: 'Country PL' }),
    ).toBeInTheDocument();
  });

  it('locks the rank menu with the reason for a role that may not list the ranks', async () => {
    await renderAccounts('/accounts', { role: 'reader' });
    const menu = await screen.findByRole('combobox', { name: 'Rank' });
    expect(menu).toBeDisabled();
    expect(menu).toHaveAttribute('title', 'You need the groups:read permission');
  });

  it('reads the list and the counts again with the refresh tool', async () => {
    const user = userEvent.setup();
    let reads = 0;
    mockServer.use(
      http.get('*/admin/clients', ({ request }) => {
        reads += 1;
        return HttpResponse.json([account()], {
          headers: { 'x-total-count': '1', ...EXPOSE, 'x-seen': request.url },
        });
      }),
    );
    await renderAccounts();
    await accountRow('Daniel Whitmore');
    const before = reads;
    await user.click(screen.getByRole('button', { name: 'Refresh the list' }));
    await waitFor(() => expect(reads).toBeGreaterThan(before));
  });
});

describe('the empty states', () => {
  it('says nothing matches, in the words of the filters, with a way back to the same population', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts('/accounts?chip=merchants&q=nobody-by-that-name&status=suspended');
    expect(await screen.findByText('No account matches', {}, SLOW)).toBeInTheDocument();
    expect(screen.getByText(/Nothing matches “nobody-by-that-name”, Suspended\./)).toBeInTheDocument();
    const clear = screen.getByRole('link', { name: 'Clear the search' });
    expect(clear).toHaveAttribute('href', '/accounts?chip=merchants');
    await user.click(clear);
    await waitFor(() => expect(app.location()).toBe('/accounts?chip=merchants'));
    await waitFor(async () => expect((await accountNames()).length).toBe(20));
  });

  it('invites the first account when there are none at all', async () => {
    mockServer.use(
      http.get('*/admin/clients', EMPTY_LIST),
      http.get('*/admin/clients/counts', () =>
        HttpResponse.json({
          all: 0,
          retail: 0,
          merchant: 0,
          guests: 0,
          active: 0,
          suspended: 0,
          blocked: 0,
          anonymized: 0,
          invitationPending: 0,
        }),
      ),
    );
    await renderAccounts();
    expect(await screen.findByText('No accounts yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add an account' })).toHaveAttribute(
      'href',
      '/accounts?view=add',
    );
  });

  it('offers no way to add without clients:create', async () => {
    mockServer.use(http.get('*/admin/clients', EMPTY_LIST));
    await renderAccounts('/accounts', { role: 'reader' });
    expect(await screen.findByText('No accounts yet')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add an account' })).not.toBeInTheDocument();
  });

  it('says so for a population that is empty with no filter on', async () => {
    mockServer.use(
      http.get('*/admin/clients', ({ request }) =>
        new URL(request.url).searchParams.has('hasAccount') ? EMPTY_LIST() : undefined,
      ),
    );
    await renderAccounts('/accounts?chip=guests');
    expect(await screen.findByText('No guests')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear the search' })).not.toBeInTheDocument();
  });

  it('asks the Owner to give an account a merchant rank when no account has one', async () => {
    mockServer.use(
      http.get('*/admin/clients', ({ request }) =>
        new URL(request.url).searchParams.get('rankKind') === 'merchant' ? EMPTY_LIST() : undefined,
      ),
    );
    await renderAccounts('/accounts?chip=merchants');
    expect(await screen.findByText('No account with a merchant rank yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add an account and give it a merchant rank' })).toHaveAttribute(
      'href',
      '/accounts?view=add',
    );
  });

  it('tells a role that is not the Owner that only the Owner gives a merchant rank', async () => {
    mockServer.use(
      http.get('*/admin/clients', ({ request }) =>
        new URL(request.url).searchParams.get('rankKind') === 'merchant' ? EMPTY_LIST() : undefined,
      ),
    );
    await renderAccounts('/accounts?chip=merchants', { role: 'manager' });
    expect(await screen.findByText('No account with a merchant rank yet')).toBeInTheDocument();
    expect(screen.getByText('Only the Owner gives an account a merchant rank.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /give it a merchant rank/ })).not.toBeInTheDocument();
  });

  it('says there are no retail accounts when that population is empty', async () => {
    mockServer.use(
      http.get('*/admin/clients', ({ request }) =>
        new URL(request.url).searchParams.get('rankKind') === 'retail' ? EMPTY_LIST() : undefined,
      ),
    );
    await renderAccounts('/accounts?chip=retail');
    expect(await screen.findByText('No retail accounts yet')).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('shows a role that reads accounts the All view only, with no way to add and no Data requests', async () => {
    await renderAccounts('/accounts', { role: 'reader' });
    const views = await viewLinks();
    expect(linkTexts(views)).toEqual(['All']);
    expect(await accountsTable()).toBeInTheDocument();
    expect(linkTexts(await stripTabs())).toHaveLength(4);
    // clients:read alone has no wallet permission: no wallet column, no 30-day spend.
    expect(
      within(await accountsTable()).queryByRole('columnheader', { name: 'Wallet' }),
    ).not.toBeInTheDocument();
  });

  it('shows the Data requests link to a role that holds clients:read and customers:privacy', async () => {
    await renderAccounts('/accounts', { permissions: ['clients:read', 'customers:privacy'] });
    await waitFor(async () => expect(linkTexts(await viewLinks())).toEqual(['All', 'Data requests (1)']));
  });

  it('lands a role that reads only the ranks on Ranks, with no strip', async () => {
    const app = await renderAccounts('/accounts', { role: 'groupsOnly' });
    expect(await screen.findByRole('region', { name: 'Ranks' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Accounts shown' })).not.toBeInTheDocument();
    expect(linkTexts(await viewLinks())).toEqual(['Ranks']);
    expect(app.location()).toBe('/accounts');
  });

  it('sends a role that reads only the ranks to Ranks from the address of the All view, and replaces it', async () => {
    const app = await renderAccounts('/accounts?view=all', { role: 'groupsOnly' });
    await waitFor(() => expect(app.location()).toBe('/accounts?view=ranks'));
  });

  it('says there is nothing here for a role that reaches the page with no usable view', async () => {
    await signInAs();
    mockMe({ id: 1, name: 'Rami K.', permissions: ['orders:read'] });
    // The page's own gate would stop this role at the door; mount the page without it.
    renderShell('/accounts', <Route path="/accounts" element={<AccountsPage />} />);
    expect(await screen.findByText('Nothing here for your role', {}, SLOW)).toBeInTheDocument();
    expect(
      screen.getByText('Your role cannot see accounts or ranks. Ask an owner if you need access.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Views' })).not.toBeInTheDocument();
  });

  it('sends a role that reads neither list to the no-access page', async () => {
    await signInAs();
    mockMe({ id: 1, name: 'Rami K.', permissions: ['orders:read'] });
    renderApp('/accounts');
    expect(await screen.findByText('You do not have access to this page', {}, SLOW)).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Accounts shown' })).not.toBeInTheDocument();
  });
});
