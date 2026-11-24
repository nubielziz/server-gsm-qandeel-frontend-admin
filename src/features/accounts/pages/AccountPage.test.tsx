// Tests for one account's page, run through the whole app against the dev mock API: the states (no such account, a bad address, a failed read,
// a role that may not read accounts), the strip with the account's own tab, the title and the line under it, the left menu of the parts
// (which a merchant, a retail login and a guest show, and what each permission takes away), and the part kept in the address. The parts and
// the dialogs have their own tests; the part and the dialog host are tested with the record itself (OpenAccount.test.tsx).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Link, Route } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { AccountPage } from './AccountPage';
import { account } from '../test/fixtures';
import { installAccountMocks } from '../test/installAccountMocks';
import {
  currentLink,
  linkTexts,
  partsMenu,
  renderAccount,
  renderAccounts,
  stripTabs,
  viewLinks,
} from './test-utils';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

// Holds the read of one account until the test lets it go, so what the page draws while it waits can be looked at without a race.
function holdReads(id: string) {
  let release = () => {};
  const open = new Promise<void>((resolve) => {
    release = resolve;
  });
  mockServer.use(
    http.get(`*/admin/clients/${id}`, async () => {
      await open;
      return undefined;
    }),
  );
  return { release: () => release() };
}

const DANIEL = /Daniel Whitmore/; // 101: a retail login, 4 orders, one session, a $50 store balance
const ZAIN = /Zain Mobile Hub/; // 1: a VIP merchant
const SOFIA = /Sofia Alvarez/; // 102: a guest
const menuTexts = () =>
  partsMenu()
    .getAllByRole('link')
    .map((link) => link.textContent);
const currentPart = () =>
  partsMenu()
    .getAllByRole('link')
    .find((link) => link.getAttribute('aria-current') === 'page')?.textContent;

describe('the states', () => {
  it('says so when no account has that number, with a way back, and keeps the strip and the links', async () => {
    await renderAccounts('/accounts/9999');
    expect(await screen.findByText('This account does not exist')).toBeInTheDocument();
    expect(screen.getByText('There is no account #9999. It may have been removed.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to All' })).toHaveAttribute('href', '/accounts');
    expect(linkTexts(await stripTabs())).toHaveLength(4);
    // No population is raised: the account's own tab is not there.
    expect(currentLink(await stripTabs())).toBeUndefined();
    expect(currentLink(await viewLinks())).toBe('All');
    expect(partsMenu).toThrow();
  });

  it.each(['abc', '0', '-4', '3.5'])(
    'treats the address /accounts/%s, which is not an account number, the same way',
    async (id) => {
      await renderAccounts(`/accounts/${id}`);
      expect(await screen.findByText('This account does not exist')).toBeInTheDocument();
      expect(screen.getByText('That address is not an account number.')).toBeInTheDocument();
    },
  );

  it('shows the server’s error with a Retry button when the account cannot load', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/clients/:id', () =>
        problem(503, 'UNAVAILABLE', 'Service unavailable', 'Try again soon.'),
      ),
    );
    await renderAccounts('/accounts/101');
    // A 5xx answer is read again once, after a pause, before the error shows.
    expect(
      await screen.findByText('Could not load this account', {}, { timeout: 8_000 }),
    ).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { level: 2, name: DANIEL })).toBeInTheDocument();
  });

  it('shows the skeletons of the page while the account is read, then the account', async () => {
    const gate = holdReads('101');
    await renderAccounts('/accounts/101');
    expect(await screen.findByRole('status', { name: 'Loading the account' })).toBeInTheDocument();
    // The strip and the links are drawn at once; the title waits for the account.
    expect(linkTexts(await viewLinks())).toContain('All');
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    gate.release();
    expect(await screen.findByRole('heading', { level: 2, name: DANIEL })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading the account' })).not.toBeInTheDocument();
  });

  it('says a role that may open the page for the ranks cannot read accounts, and draws no strip', async () => {
    await renderAccounts('/accounts/101', { role: 'groupsOnly' });
    expect(await screen.findByText('Your role cannot read accounts')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Accounts shown' })).not.toBeInTheDocument();
    expect(linkTexts(await viewLinks())).toEqual(['Ranks']);
  });

  it('never reads an account the role may not read', async () => {
    const seen: string[] = [];
    mockServer.use(
      http.get('*/admin/clients/:id', ({ params }) => {
        if (/^\d+$/.test(String(params.id))) seen.push(String(params.id));
        return undefined;
      }),
    );
    await renderAccounts('/accounts/101', { role: 'groupsOnly' });
    await screen.findByText('Your role cannot read accounts');
    expect(seen).toEqual([]);
  });
});

describe('the title and the strip', () => {
  it('names the account in the left menu, with its number, rank and status, and in the breadcrumb and the tab title', async () => {
    await renderAccount(101, DANIEL);
    expect(screen.getByRole('heading', { level: 1, name: 'Accounts' })).toBeInTheDocument();
    const title = screen.getByRole('heading', { level: 2, name: DANIEL });
    const side = title.parentElement as HTMLElement;
    expect(within(side).getByText(/#101 · Storefront retail ·/)).toBeInTheDocument();
    expect(within(side).getByText('Active')).toBeInTheDocument();
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts');
    expect(within(crumb).getByText('Daniel Whitmore')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toContain('Daniel Whitmore'));
  });

  it('names an account with no name by its email in the title, the breadcrumb and the tab title', async () => {
    const email = /no\.name@mail\.example/;
    await renderAccount(131, email);
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByText('no.name@mail.example')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toContain('no.name@mail.example'));
    // The left menu's line under the title (the Overview repeats the status).
    const side = screen.getByRole('heading', { level: 2, name: email }).parentElement as HTMLElement;
    expect(within(side).getByText(/#131 · Storefront retail ·/)).toBeInTheDocument();
    expect(within(side).getByText('Guest')).toBeInTheDocument();
  });

  it('falls back to the account number when the name and the email are both empty', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id', () => HttpResponse.json(account({ id: 77, name: '', email: '' }))),
    );
    await renderAccount(77, /Account #77/);
    expect(screen.getByRole('heading', { level: 2, name: 'Account #77' })).toBeInTheDocument();
  });

  it('names an anonymized account "Deleted account" and offers the parts accounting keeps', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id', () =>
        HttpResponse.json(account({ id: 12, status: 'anonymized', name: '', email: '', security: null })),
      ),
    );
    await renderAccount(12, 'Deleted account');
    const side = screen.getByRole('heading', { level: 2, name: 'Deleted account' })
      .parentElement as HTMLElement;
    expect(within(side).getByText('Anonymized')).toBeInTheDocument();
    expect(menuTexts()).toEqual([
      'Overview',
      'Invoices',
      'Payments',
      'Orders4',
      'Support',
      'Statement',
      'Privacy and risk',
      'Activity Log',
    ]);
  });

  it('shows a status it does not know as it is, instead of failing', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id', () =>
        HttpResponse.json(account({ status: 'pending_review' as never })),
      ),
    );
    await renderAccount(101, DANIEL);
    const side = screen.getByRole('heading', { level: 2, name: DANIEL }).parentElement as HTMLElement;
    expect(within(side).getByText('pending_review')).toBeInTheDocument();
  });

  it('adds the account as the last tab of the strip, raised, and lights All in the row of links', async () => {
    await renderAccount(101, DANIEL);
    const strip = await stripTabs();
    await waitFor(() =>
      expect(linkTexts(strip)).toEqual([
        'All accounts (51)',
        'Retail (31)',
        'Merchants (20)',
        'Guests (21)',
        'Daniel Whitmore',
      ]),
    );
    expect(currentLink(strip)).toBe('Daniel Whitmore');
    expect(strip.getByRole('link', { name: 'Daniel Whitmore' })).toHaveAttribute('href', '/accounts/101');
    expect(currentLink(await viewLinks())).toBe('All');
  });

  it('goes back to the list as it was last seen', async () => {
    sessionStorage.setItem(
      'gsm-accounts-list-address',
      JSON.stringify({ merchants: 'chip=merchants&q=zain', last: 'merchants' }),
    );
    await renderAccount(1, ZAIN);
    expect(screen.getByRole('link', { name: 'Back to All' })).toHaveAttribute(
      'href',
      '/accounts?chip=merchants&q=zain',
    );
    expect((await stripTabs()).getByRole('link', { name: /^Merchants/ })).toHaveAttribute(
      'href',
      '/accounts?chip=merchants&q=zain',
    );
  });

  it('has one level-1 heading, "Accounts", and the account in a level 2', async () => {
    await renderAccount(101, DANIEL);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('the parts', () => {
  it('shows a merchant all thirteen parts, in the order of the layout', async () => {
    await renderAccount(1, ZAIN);
    expect(menuTexts()).toEqual([
      'Overview',
      'Financial',
      'Profile',
      'Invoices',
      'Payments',
      'API',
      'Security',
      'Prices',
      'Orders72',
      'Support',
      'Statement',
      'Privacy and risk',
      'Activity Log',
    ]);
    expect(currentPart()).toBe('Overview');
  });

  it('shows a retail login eleven parts, with the number of orders on Orders', async () => {
    await renderAccount(101, DANIEL);
    expect(menuTexts()).toEqual([
      'Overview',
      'Financial',
      'Profile',
      'Invoices',
      'Payments',
      'Security',
      'Orders4',
      'Support',
      'Statement',
      'Privacy and risk',
      'Activity Log',
    ]);
  });

  it('shows a guest seven parts: no wallet, payments (top-ups), API, sign-in details, prices or statement, but the receipts in Invoices', async () => {
    await renderAccount(102, SOFIA);
    expect(menuTexts()).toEqual([
      'Overview',
      'Profile',
      'Invoices',
      'Orders0',
      'Support',
      'Privacy and risk',
      'Activity Log',
    ]);
  });

  it('leaves out the parts a role cannot read: clients:read alone opens Overview, Profile, Security and Privacy and risk', async () => {
    await renderAccount(101, DANIEL, { role: 'reader' });
    expect(menuTexts()).toEqual(['Overview', 'Profile', 'Security', 'Privacy and risk']);
  });

  it('leaves out Financial and Statement without wallet:read, and the wallet figures with them', async () => {
    await renderAccount(1, ZAIN, { role: 'noWallet' });
    expect(menuTexts()).not.toContain('Financial');
    expect(menuTexts()).not.toContain('Statement');
    expect(menuTexts()).toContain('Prices');
  });

  it('keeps the open part in the address, and leaves the Overview out of it', async () => {
    const user = userEvent.setup();
    const app = await renderAccount(101, DANIEL);
    await user.click(partsMenu().getByRole('link', { name: 'Security' }));
    await waitFor(() => expect(app.location()).toBe('/accounts/101?tab=security'));
    expect(currentPart()).toBe('Security');
    await user.click(partsMenu().getByRole('link', { name: 'Overview' }));
    await waitFor(() => expect(app.location()).toBe('/accounts/101'));
    expect(currentPart()).toBe('Overview');
  });

  it('opens the part named in the address', async () => {
    await renderAccount(101, DANIEL, { tab: 'statement' });
    expect(currentPart()).toBe('Statement');
    expect(screen.getByRole('region', { name: 'Daniel Whitmore' })).toBeInTheDocument();
  });

  it.each([
    ['billing', 'a word of the old customers page'],
    ['risk', 'a retired tab'],
    ['api', 'a part a retail account does not have'],
    ['nothing', 'an unknown word'],
  ])('opens the Overview for ?tab=%s (%s), without rewriting the address', async (tab) => {
    const app = await renderAccount(101, DANIEL, { tab });
    expect(currentPart()).toBe('Overview');
    expect(app.location()).toBe(`/accounts/101?tab=${tab}`);
  });

  it('opens the Overview for a part the role may not read', async () => {
    await renderAccount(101, DANIEL, { role: 'reader', tab: 'audit' });
    expect(currentPart()).toBe('Overview');
  });

  it('opens Orders for an address with an order and no part, and the part named when there is one', async () => {
    const app = await renderAccounts('/accounts/101?order=48100');
    expect(await screen.findByRole('heading', { level: 2, name: DANIEL })).toBeInTheDocument();
    expect(currentPart()).toMatch(/^Orders/);
    expect(app.location()).toBe('/accounts/101?order=48100');
  });

  it('opens the part named even when an order is named too', async () => {
    await renderAccounts('/accounts/101?tab=support&order=48100');
    expect(await screen.findByRole('heading', { level: 2, name: DANIEL })).toBeInTheDocument();
    expect(currentPart()).toBe('Support');
  });

  it('never shows one account under the number of another while the next one loads', async () => {
    const user = userEvent.setup();
    const gate = holdReads('1');
    await signInAs();
    mockMe({ id: 1, name: 'Rami K.', permissions: ['*'] });
    renderShell(
      '/accounts/101',
      <Route
        path="/accounts/:id"
        element={
          <>
            <AccountPage />
            <Link to="/accounts/1">Go to the merchant</Link>
          </>
        }
      />,
    );
    expect(await screen.findByRole('heading', { level: 2, name: DANIEL })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Go to the merchant' }));
    // The merchant is being read: Daniel's record is gone, and the merchant's is not here yet.
    expect(await screen.findByRole('status', { name: 'Loading the account' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: DANIEL })).not.toBeInTheDocument();
    gate.release();
    expect(await screen.findByRole('heading', { level: 2, name: ZAIN })).toBeInTheDocument();
  });

  it('draws the page as one frame: the heading, the two rows of links and the record in the rest', async () => {
    await renderAccount(101, DANIEL);
    const record = screen.getByRole('region', { name: 'Daniel Whitmore' });
    expect(record.parentElement).toHaveClass('page-frame');
    expect(record).toHaveClass('flex', 'flex-1', 'flex-col');
    expect(record.querySelector('.parts-layout')).not.toBeNull();
  });
});
