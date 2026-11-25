// Tests for the shell, run through the whole app against the dev mock API: the permission-aware sidebar, the
// permission gate and 404 pages, keyboard shortcuts, the palette, the display menu, the mobile menu, focus handling and
// the account menu.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, renderApp, renderShell, signInAs, setupMockApi } from '@/test/renderApp';
import { useBreadcrumbTitle } from './breadcrumbTitle';

setupMockApi();
afterEach(() => vi.restoreAllMocks());

const OWNER_PAGES = [
  'Dashboard',
  'Orders',
  'Accounts',
  'Support',
  'Risk & checks',
  'Notifications',
  'Product / Services',
  'Suppliers',
  'Money',
  'Admins & access',
  'Settings',
  'Shop content',
  'Audit log',
  'System health',
];

async function primaryNav() {
  return within(await screen.findByRole('navigation', { name: 'Primary' }));
}

// A sidebar link's page label: its text without the count chip and the screen-reader count text ("Orders48" → "Orders").
// Labels have no digits, so everything from the first digit on is the count.
const labelOf = (link: HTMLElement) => (link.textContent ?? '').replace(/\d.*$/, '');

describe('sidebar', () => {
  it('lists the 14 pages (the demo’s, with Accounts in the place of Merchants and Customers, Money in the place of Finance and Refunds & disputes, Product / Services, Notifications and System health) in four groups, and marks the current one', async () => {
    mockMe({ permissions: ['*'] });
    renderApp('/orders');
    const nav = await primaryNav();
    expect(nav.getAllByRole('link').map(labelOf)).toEqual(OWNER_PAGES);
    // The headings are the group labels (paragraphs), in order.
    const headings = nav
      .getAllByText(/^(Operations|Catalog|Money|System)$/)
      .filter((el) => el.tagName === 'P');
    expect(headings.map((el) => el.textContent)).toEqual(['Operations', 'Catalog', 'Money', 'System']);
    expect(nav.getByRole('link', { name: /^Orders/ })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('link', { name: /^Orders/ })).toHaveAttribute('href', '/orders');
    expect(nav.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('links Notifications at /notifications', async () => {
    mockMe({ permissions: ['*'] });
    renderApp('/orders');
    const nav = await primaryNav();
    expect(nav.getByRole('link', { name: 'Notifications' })).toHaveAttribute('href', '/notifications');
  });

  it('shows Notifications to a staff member with broadcasts:read alone', async () => {
    mockMe({ permissions: ['dashboard:read', 'broadcasts:read'] });
    renderApp('/dashboard');
    expect((await primaryNav()).getAllByRole('link').map(labelOf)).toEqual(['Dashboard', 'Notifications']);
  });

  it('hides the pages the staff member may not open, and the groups left empty', async () => {
    mockMe({ permissions: ['dashboard:read', 'orders:read', 'ledger:*'] });
    renderApp('/dashboard');
    const nav = await primaryNav();
    expect(nav.getAllByRole('link').map(labelOf)).toEqual(['Dashboard', 'Orders', 'Money']);
    expect(nav.getByText('Operations')).toBeInTheDocument();
    // The group heading and the page link are both called Money.
    expect(nav.getByText('Money', { selector: 'p' })).toBeInTheDocument();
    expect(nav.queryByText('Catalog')).not.toBeInTheDocument();
    expect(nav.queryByText('System')).not.toBeInTheDocument();
  });

  it('follows the permission each page declares, not its name', async () => {
    // Accounts are `clients:read`, Product / Services `catalog:read`, Admins `staff:read` in the map.
    mockMe({ permissions: ['clients:read', 'catalog:*', 'staff:read'] });
    renderApp('/accounts');
    const nav = await primaryNav();
    // catalog:* does not open Shop content: the TAC catalogue was the one tab it opened there (decision 025), so the page takes
    // storefront:read or legal:read only.
    expect(nav.getAllByRole('link').map(labelOf)).toEqual([
      'Accounts',
      'Product / Services',
      'Admins & access',
    ]);
  });

  it.each(['clients:read', 'groups:read'])(
    'opens Accounts, once and under no old name, for a role that holds only %s',
    async (permission) => {
      mockMe({ permissions: ['dashboard:read', permission] });
      renderApp('/dashboard');
      const labels = (await primaryNav()).getAllByRole('link').map(labelOf);
      expect(labels).toEqual(['Dashboard', 'Accounts']);
    },
  );

  it('keeps Accounts from a role that holds neither accounts permission, whatever else it holds', async () => {
    // `customers:read` was the Customers page; it opens nothing now. `customers:privacy` is a part of the Accounts page, not a way in.
    mockMe({ permissions: ['dashboard:read', 'customers:read', 'customers:privacy', 'wallet:read'] });
    renderApp('/dashboard');
    expect((await primaryNav()).getAllByRole('link').map(labelOf)).not.toContain('Accounts');
  });

  it.each(['pricing:read', 'inventory:read', 'storefront:read'])(
    'opens Product / Services for a role that holds only %s (one view’s read permission)',
    async (permission) => {
      mockMe({ permissions: ['dashboard:read', permission] });
      renderApp('/dashboard');
      expect((await primaryNav()).getAllByRole('link').map(labelOf)).toContain('Product / Services');
    },
  );

  it('keeps Product / Services from a role that holds none of its views’ read permissions', async () => {
    mockMe({ permissions: ['dashboard:read', 'suppliers:read'] });
    renderApp('/dashboard');
    expect((await primaryNav()).getAllByRole('link').map(labelOf)).toEqual(['Dashboard', 'Suppliers']);
  });

  it('lists Product / Services first in its group and Shop content in System, after Settings', async () => {
    mockMe({ permissions: ['*'] });
    renderApp('/dashboard');
    const links = (await primaryNav()).getAllByRole('link');
    const labels = links.map(labelOf);
    expect(labels.indexOf('Product / Services')).toBe(labels.indexOf('Suppliers') - 1);
    expect(labels.indexOf('Shop content')).toBe(labels.indexOf('Settings') + 1);
    expect(links[labels.indexOf('Product / Services')]).toHaveAttribute('href', '/products');
    expect(links[labels.indexOf('Shop content')]).toHaveAttribute('href', '/storefront');
  });

  it('shows the API health and the signed-in staff member at the foot', async () => {
    mockMe({ permissions: ['*'], name: 'Rami K.', role: { id: 1, name: 'Owner' } });
    renderApp('/dashboard');
    expect(await screen.findByText('API healthy')).toBeInTheDocument();
    const account = await screen.findByRole('button', { name: 'Account menu for Rami K.' });
    expect(account).toHaveTextContent('Rami K.');
    expect(account).toHaveTextContent('Owner');
    expect(screen.queryByText(/synthetic data/i)).not.toBeInTheDocument();
  });
});

describe('top bar slots', () => {
  it('shows the feature controls (the staff bell) in the top bar before the display menu', async () => {
    mockMe({ permissions: ['*'] });
    renderApp('/dashboard');
    const bell = await screen.findByRole('button', { name: /^Notifications/ });
    const topbar = bell.closest('header') as HTMLElement;
    expect(topbar).toHaveAttribute('id', 'topbar');
    const buttons = within(topbar).getAllByRole('button');
    const display = within(topbar).getByRole('button', { name: /^Display/ });
    expect(buttons.indexOf(bell)).toBeGreaterThan(-1);
    expect(buttons.indexOf(bell)).toBeLessThan(buttons.indexOf(display));
  });

  it('keeps the bell for a staff member who may not open the Notifications page: every staff member has an inbox', async () => {
    mockMe({ permissions: ['dashboard:read'] });
    renderApp('/dashboard');
    expect(await screen.findByRole('button', { name: /^Notifications/ })).toBeInTheDocument();
    expect((await primaryNav()).queryByRole('link', { name: /^Notifications/ })).not.toBeInTheDocument();
  });
});

describe('start page', () => {
  it('sends a role without the dashboard to the first page it may open', async () => {
    mockMe({ permissions: ['support:*', 'clients:read'] });
    const app = renderApp('/');
    // Accounts is a lazy chunk (mockMe starts the mock session its data calls need).
    await screen.findByRole('heading', { level: 1, name: 'Accounts' }, { timeout: 10_000 });
    expect(app.location()).toBe('/accounts');
  });

  it('says so when the role opens no page at all', async () => {
    mockMe({ permissions: [] });
    renderApp('/');
    expect(await screen.findByText('Your role has no pages yet')).toBeInTheDocument();
  });
});

describe('page gate and unknown addresses', () => {
  it('sends `/` to the dashboard', async () => {
    mockMe({ permissions: ['*'] });
    const app = renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(app.location()).toBe('/dashboard');
  });

  it('shows the no-access page, with a way out, when the permission is missing', async () => {
    mockMe({ permissions: ['dashboard:read'] });
    renderApp('/audit');
    expect(await screen.findByRole('heading', { level: 1, name: 'Audit log' })).toBeInTheDocument();
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
    expect(screen.getByText('audit:read')).toBeInTheDocument();
    expect(screen.queryByText('This page is being ported')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/dashboard');
  });

  it('opens the detail view of an account with the accounts permission', async () => {
    mockMe({ permissions: ['clients:read'] });
    renderApp('/accounts/12');
    // The account page (a lazy chunk) shows its own heading: the account's name or its not-found words.
    expect(await screen.findByRole('heading', { level: 1 }, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.queryByText('You do not have access to this page')).not.toBeInTheDocument();
  });

  it('refuses the detail view of an account to a role without either accounts permission, naming both', async () => {
    mockMe({ permissions: ['orders:read', 'customers:read'] });
    renderApp('/accounts/5');
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
    expect(screen.getByText('clients:read or groups:read')).toBeInTheDocument();
  });

  it('refuses an old customer address, once it is sent to Accounts, to a role that holds only customers:read', async () => {
    mockMe({ permissions: ['customers:read'] });
    const app = renderApp('/customers/5');
    // The old address is redirected before the gate; the gate then asks the Accounts page's permission.
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
    expect(app.location()).toBe('/accounts/5?from=customer');
  });

  it('shows a not-found page inside the shell for an address no page matches', async () => {
    mockMe({ permissions: ['*'] });
    renderApp('/nothing/here');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText('Nothing at this address')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the start page' })).toHaveAttribute('href', '/');
    expect(await primaryNav()).toBeDefined();
    expect(document.title).toBe('Page not found · IMEI-HUB');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Page not found');
  });
});

describe('breadcrumb and tab title', () => {
  function RecordPage() {
    useBreadcrumbTitle('Acme Ltd');
    return <p>record page</p>;
  }

  it('shows Group / Page on a list page', async () => {
    mockMe({ permissions: ['*'] });
    renderApp('/money');
    const crumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    // The group and the page are both called Money: the page is the last crumb.
    const names = within(crumb).getAllByText('Money');
    expect(names).toHaveLength(2);
    expect(names[1]).toHaveAttribute('aria-current', 'page');
  });

  it('adds the record name set by a detail page, and clears it when that page closes', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    renderShell(
      '/accounts/12',
      <>
        <Route path="/accounts/:id" element={<RecordPage />} />
        <Route path="/accounts" element={<p>account list</p>} />
      </>,
    );
    const crumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByText('Operations')).toBeInTheDocument();
    expect(within(crumb).getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts');
    expect(within(crumb).getByText('Acme Ltd')).toHaveAttribute('aria-current', 'page');
    expect(document.title).toBe('Acme Ltd · Accounts · IMEI-HUB');

    await user.click(within(crumb).getByRole('link', { name: 'Accounts' }));
    expect(await screen.findByText('account list')).toBeInTheDocument();
    expect(screen.queryByText('Acme Ltd')).not.toBeInTheDocument();
    expect(document.title).toBe('Accounts · IMEI-HUB');
  });
});

describe('keyboard shortcuts in the shell', () => {
  it('"g" then "o" opens the orders page', async () => {
    // The orders page is built: it loads as a lazy chunk and calls the API, so it needs a session and some patience.
    await signInAs();
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await primaryNav();
    await user.keyboard('go');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Orders' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(app.location()).toBe('/orders');
  }, 20_000);

  it('"g" then "m" opens the accounts page', async () => {
    await signInAs();
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await primaryNav();
    await user.keyboard('gm');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Accounts' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(app.location()).toBe('/accounts');
  }, 20_000);

  it('"g" then "f" opens the Money page', async () => {
    await signInAs();
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await primaryNav();
    await user.keyboard('gf');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Money' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(app.location()).toBe('/money');
  }, 20_000);

  it('"g" then "r" opens nothing: Refunds & disputes is part of Money', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await primaryNav();
    await user.keyboard('gr');
    expect(app.location()).toBe('/dashboard');
  });

  it('"g" then "k" opens nothing: Customers is retired', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await primaryNav();
    await user.keyboard('gk');
    expect(app.location()).toBe('/dashboard');
  });

  it('does not jump to a page the staff member may not open', async () => {
    mockMe({ permissions: ['dashboard:read'] });
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await primaryNav();
    await user.keyboard('ga');
    expect(app.location()).toBe('/dashboard');
    await user.keyboard('gm');
    expect(app.location()).toBe('/dashboard');
  });

  it('⌘K / Ctrl+K opens the command palette and a second press closes it', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    renderApp('/dashboard');
    await primaryNav();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    await user.keyboard('{Control>}k{/Control}');
    expect(await screen.findByRole('combobox')).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();

    await user.keyboard('{Meta>}k{/Meta}');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('"?" lists the shortcuts and "/" opens the palette when the page has no search field', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    renderApp('/dashboard');
    await primaryNav();

    await user.keyboard('?');
    expect(await screen.findByRole('heading', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
    expect(screen.getByText('g then d / o / m')).toBeInTheDocument();
    expect(screen.getByText('Go to dashboard / orders / accounts')).toBeInTheDocument();
    // The Customers key is retired, so the list names neither Customers nor its key.
    expect(screen.getByText('g then s / i')).toBeInTheDocument();
    const shortcuts = screen
      .getByRole('heading', { name: 'Keyboard shortcuts' })
      .closest('dialog') as HTMLElement;
    expect(within(shortcuts).queryByText(/customers/i)).not.toBeInTheDocument();
    // Finance and Refunds & disputes are the one Money page: "r" is retired and "f" opens Money.
    expect(within(shortcuts).getByText('g then f / a')).toBeInTheDocument();
    expect(within(shortcuts).getByText('Go to money / audit')).toBeInTheDocument();
    expect(within(shortcuts).queryByText(/refunds/i)).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('heading', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();

    await user.keyboard('/');
    expect(await screen.findByRole('combobox')).toBeInTheDocument();
  });

  it('opens the shortcut list from the account menu', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    renderApp('/dashboard');
    await user.click(await screen.findByRole('button', { name: /Account menu for/ }));
    await user.click(screen.getByRole('menuitem', { name: /Keyboard shortcuts/ }));
    expect(await screen.findByRole('heading', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
  });
});

describe('command palette', () => {
  it('jumps to a permitted page, and lists no page the staff member may not open', async () => {
    mockMe({ permissions: ['dashboard:read', 'ledger:read'] });
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await primaryNav();
    await user.click(screen.getByRole('button', { name: 'Search or jump to, command palette' }));
    const input = await screen.findByRole('combobox');

    // Only what this staff member may open: no risk or orders shortcuts, and neither money action, whose views (Refunds, Deposits)
    // need refunds:read and payments:read; ledger:read opens the Money page only.
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Dashboard',
      'Money',
      'Toggle dark mode',
    ]);
    await user.type(input, 'mon');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.keyboard('{Enter}');
    // Pages are lazy chunks: the first load in a busy test run can take more than a second.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Money' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(app.location()).toBe('/money');
  });

  it('starts empty again after a second ⌘K closed it with text typed', async () => {
    mockMe({ permissions: ['dashboard:read', 'ledger:read'] });
    const user = userEvent.setup();
    renderApp('/dashboard');
    await primaryNav();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'mon');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    // Closed from outside (the shortcut), not through the palette's own close path.
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('{Control>}k{/Control}');
    expect(await screen.findByRole('combobox')).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('opens the demo’s quick actions with their deep links', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await primaryNav();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'refund requests');
    await user.keyboard('{Enter}');
    // Money is a lazy chunk.
    await screen.findByRole('heading', { level: 1, name: 'Money' }, { timeout: 10_000 });
    expect(app.location()).toBe('/money?view=refunds&status=requested');
  });
});

describe('display menu', () => {
  it('sets the theme on <html> and remembers it', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    renderApp('/dashboard');
    await user.click(await screen.findByRole('button', { name: 'Display' }));
    expect(screen.getByRole('menuitemradio', { name: 'Theme: system' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await user.click(screen.getByRole('menuitemradio', { name: 'Theme: dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('gsm-theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Display' }));
    expect(screen.getByRole('menuitemradio', { name: 'Theme: dark' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(screen.getByRole('menuitemradio', { name: 'Theme: system' }));
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(localStorage.getItem('gsm-theme')).toBeNull();
  });

  it('switches compact rows on and off and remembers it', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    renderApp('/dashboard');
    await user.click(await screen.findByRole('button', { name: 'Display' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Compact rows' }));
    expect(document.documentElement).toHaveClass('dense');
    expect(localStorage.getItem('gsm-dense')).toBe('1');

    await user.click(screen.getByRole('button', { name: 'Display' }));
    expect(screen.getByRole('menuitemradio', { name: 'Compact rows' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(screen.getByRole('menuitemradio', { name: 'Compact rows' }));
    expect(document.documentElement).not.toHaveClass('dense');
    expect(localStorage.getItem('gsm-dense')).toBe('0');
  });

  it('applies what was saved, so a reload keeps the choice', async () => {
    localStorage.setItem('gsm-theme', 'dark');
    localStorage.setItem('gsm-dense', '1');
    mockMe({ permissions: ['*'] });
    renderApp('/dashboard');
    await primaryNav();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveClass('dense');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Display' }));
    expect(screen.getByRole('menuitemradio', { name: 'Theme: dark' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: 'Compact rows' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('has the demo’s theme button, which flips light and dark', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    renderApp('/dashboard');
    const toggle = await screen.findByRole('button', { name: 'Toggle colour theme' });
    await user.click(toggle);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await user.click(toggle);
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('gsm-theme')).toBe('light');
  });
});

describe('mobile menu', () => {
  it('opens with focus on the first link, closes on Escape and returns focus to the menu button', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    renderApp('/dashboard');
    await primaryNav();
    const button = screen.getByRole('button', { name: 'Open menu' });
    const sidebar = document.getElementById('sidebar')!;
    const scrim = document.getElementById('scrim')!;
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'sidebar');
    expect(scrim).toHaveAttribute('hidden');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(sidebar).toHaveAttribute('data-open', 'true');
    expect(scrim).not.toHaveAttribute('hidden');
    expect(within(sidebar).getAllByRole('link')[0]).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(sidebar).toHaveAttribute('data-open', 'false');
    expect(button).toHaveFocus();
  });

  it('closes when a link is followed or the scrim is pressed', async () => {
    await signInAs();
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    renderApp('/dashboard');
    await primaryNav();
    const button = screen.getByRole('button', { name: 'Open menu' });

    await user.click(button);
    await user.click(within(document.getElementById('sidebar')!).getByRole('link', { name: /^Orders/ }));
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await screen.findByRole('heading', { level: 1, name: 'Orders' }, { timeout: 10_000 });

    await user.click(button);
    await user.click(document.getElementById('scrim')!);
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(button).toHaveAttribute('aria-expanded', 'false');
  }, 20_000);

  it('closes when the page changes some other way, like a shortcut', async () => {
    await signInAs();
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    renderApp('/dashboard');
    await primaryNav();
    const button = screen.getByRole('button', { name: 'Open menu' });
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('go');
    await screen.findByRole('heading', { level: 1, name: 'Orders' }, { timeout: 10_000 });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  }, 20_000);
});

describe('focus and scrolling', () => {
  it('moves focus to <main> and scrolls to the top after a page change', async () => {
    await signInAs();
    mockMe({ permissions: ['*'] });
    const scrollTo = vi.spyOn(window, 'scrollTo');
    const user = userEvent.setup();
    renderApp('/dashboard');
    await primaryNav();
    expect(screen.getByRole('main')).not.toHaveFocus();
    expect(scrollTo).not.toHaveBeenCalled();

    await user.click((await primaryNav()).getByRole('link', { name: /^Orders/ }));
    await screen.findByRole('heading', { level: 1, name: 'Orders' }, { timeout: 10_000 });
    expect(screen.getByRole('main')).toHaveFocus();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  }, 20_000);

  it('has a skip link that moves focus to <main> without touching the address', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await primaryNav();
    await user.tab();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(app.location()).toBe('/dashboard');
  });
});

describe('account menu', () => {
  it('signs out and returns to the sign-in screen', async () => {
    await signInAs();
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await user.click(await screen.findByRole('button', { name: /Account menu for/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(app.location()).toBe('/login');
  });

  it('shows the next person their own pages and name after a sign-out', async () => {
    await signInAs();
    const user = userEvent.setup();
    renderApp('/dashboard');
    expect((await primaryNav()).getAllByRole('link')).toHaveLength(14);
    expect(await screen.findByRole('button', { name: 'Account menu for Rami K.' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Account menu for/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    await user.type(await screen.findByLabelText('Email'), 'omar@gsm-supply.example');
    await user.type(screen.getByLabelText('Password'), 'demo-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await user.type(await screen.findByLabelText('Authentication code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    // Omar is in Finance: no audit log, no admin page, no support. (Settings opens for him through its Payment methods
    // tab: payments:gateways is one of that page's any-of permissions.)
    const nav = await primaryNav();
    await screen.findByRole('button', { name: 'Account menu for Omar T.' });
    const links = nav.getAllByRole('link').map(labelOf);
    expect(links).toContain('Money');
    expect(links).not.toContain('Audit log');
    expect(links).not.toContain('Admins & access');
    expect(links).not.toContain('Support');
    expect(screen.queryByRole('button', { name: 'Account menu for Rami K.' })).not.toBeInTheDocument();
  });

  it('stays signed in and says why when the server refuses to sign out', async () => {
    await signInAs();
    mockServer.use(
      http.post('*/admin/auth/logout', () => problem(500, 'INTERNAL', 'Server error', 'Try again later.')),
    );
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await user.click(await screen.findByRole('button', { name: /Account menu for/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByText('Server error')).toBeInTheDocument();
    expect(screen.getByText(/Try again later\./)).toBeInTheDocument();
    expect(screen.queryByText('ApiError')).not.toBeInTheDocument();
    expect(app.location()).toBe('/dashboard');
  });
});
