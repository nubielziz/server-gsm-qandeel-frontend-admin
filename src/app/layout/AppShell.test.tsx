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
  'Merchants',
  'Customers',
  'Support',
  'Risk & checks',
  'Abandoned checkouts',
  'Services & pricing',
  'Suppliers',
  'Storefront',
  'Finance',
  'Commissions',
  'Refunds & disputes',
  'Admins & access',
  'Settings',
  'Audit log',
];

async function primaryNav() {
  return within(await screen.findByRole('navigation', { name: 'Primary' }));
}

describe('sidebar', () => {
  it('lists the 16 pages of the demo in four groups, and marks the current one', async () => {
    mockMe({ permissions: ['*'] });
    renderApp('/orders');
    const nav = await primaryNav();
    expect(nav.getAllByRole('link').map((link) => link.textContent)).toEqual(OWNER_PAGES);
    ['Operations', 'Catalog', 'Money', 'System'].forEach((group) =>
      expect(nav.getByText(group)).toBeInTheDocument(),
    );
    expect(nav.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/orders');
    expect(nav.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('hides the pages the staff member may not open, and the groups left empty', async () => {
    mockMe({ permissions: ['dashboard:read', 'orders:read', 'ledger:*'] });
    renderApp('/dashboard');
    const nav = await primaryNav();
    expect(nav.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Dashboard',
      'Orders',
      'Finance',
    ]);
    expect(nav.getByText('Operations')).toBeInTheDocument();
    expect(nav.getByText('Money')).toBeInTheDocument();
    expect(nav.queryByText('Catalog')).not.toBeInTheDocument();
    expect(nav.queryByText('System')).not.toBeInTheDocument();
  });

  it('follows the permission each page declares, not its name', async () => {
    // Merchants are `clients:read`, Services `catalog:read`, Admins `staff:read` in the map.
    mockMe({ permissions: ['clients:read', 'catalog:*', 'staff:read'] });
    renderApp('/merchants');
    const nav = await primaryNav();
    expect(nav.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Merchants',
      'Services & pricing',
      'Admins & access',
    ]);
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

describe('start page', () => {
  it('sends a role without the dashboard to the first page it may open', async () => {
    mockMe({ permissions: ['support:*', 'customers:read'] });
    const app = renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Customers' });
    expect(app.location()).toBe('/customers');
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
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(app.location()).toBe('/dashboard');
  });

  it('shows a page placeholder to the staff member who may open it', async () => {
    mockMe({ permissions: ['audit:read'] });
    renderApp('/audit');
    expect(await screen.findByRole('heading', { level: 1, name: 'Audit log' })).toBeInTheDocument();
    expect(await screen.findByText('This page is being ported')).toBeInTheDocument();
    expect(document.title).toBe('Audit log · GSM Supply');
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

  it('opens the detail view of a merchant with the merchants permission', async () => {
    mockMe({ permissions: ['clients:read'] });
    renderApp('/merchants/12');
    expect(await screen.findByText('This page is being ported')).toBeInTheDocument();
  });

  it('refuses the detail view of a customer without the customers permission', async () => {
    mockMe({ permissions: ['clients:read'] });
    renderApp('/customers/5');
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
  });

  it('shows a not-found page inside the shell for an address no page matches', async () => {
    mockMe({ permissions: ['*'] });
    renderApp('/nothing/here');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText('Nothing at this address')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the start page' })).toHaveAttribute('href', '/');
    expect(await primaryNav()).toBeDefined();
    expect(document.title).toBe('Page not found · GSM Supply');
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
    renderApp('/finance');
    const crumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(crumb).toHaveTextContent('Money');
    expect(within(crumb).getByText('Finance')).toHaveAttribute('aria-current', 'page');
  });

  it('adds the record name set by a detail page, and clears it when that page closes', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    renderShell(
      '/merchants/12',
      <>
        <Route path="/merchants/:id" element={<RecordPage />} />
        <Route path="/merchants" element={<p>merchant list</p>} />
      </>,
    );
    const crumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByRole('link', { name: 'Merchants' })).toHaveAttribute('href', '/merchants');
    expect(within(crumb).getByText('Acme Ltd')).toHaveAttribute('aria-current', 'page');
    expect(document.title).toBe('Acme Ltd · Merchants · GSM Supply');

    await user.click(within(crumb).getByRole('link', { name: 'Merchants' }));
    expect(await screen.findByText('merchant list')).toBeInTheDocument();
    expect(screen.queryByText('Acme Ltd')).not.toBeInTheDocument();
    expect(document.title).toBe('Merchants · GSM Supply');
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

  it('does not jump to a page the staff member may not open', async () => {
    mockMe({ permissions: ['dashboard:read'] });
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await primaryNav();
    await user.keyboard('ga');
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

    // Only what this staff member may open: no risk, refund or orders shortcuts.
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Dashboard',
      'Finance',
      'Toggle dark mode',
      'Review pending deposits',
    ]);
    await user.type(input, 'fin');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { level: 1, name: 'Finance' })).toBeInTheDocument();
    expect(app.location()).toBe('/finance');
  });

  it('starts empty again after a second ⌘K closed it with text typed', async () => {
    mockMe({ permissions: ['dashboard:read', 'ledger:read'] });
    const user = userEvent.setup();
    renderApp('/dashboard');
    await primaryNav();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'fin');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    // Closed from outside (the shortcut), not through the palette's own close path.
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('{Control>}k{/Control}');
    expect(await screen.findByRole('combobox')).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('opens the demo’s quick actions with their deep links', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await primaryNav();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'refund requests');
    await user.keyboard('{Enter}');
    await screen.findByRole('heading', { level: 1, name: 'Refunds & disputes' });
    expect(app.location()).toBe('/refunds?tab=refunds&status=requested');
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
    await user.click(within(document.getElementById('sidebar')!).getByRole('link', { name: 'Orders' }));
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

    await user.click((await primaryNav()).getByRole('link', { name: 'Orders' }));
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
    expect((await primaryNav()).getAllByRole('link')).toHaveLength(16);
    expect(await screen.findByRole('button', { name: 'Account menu for Rami K.' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Account menu for/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    await user.type(await screen.findByLabelText('Email'), 'omar@gsm-supply.example');
    await user.type(screen.getByLabelText('Password'), 'demo-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await user.type(await screen.findByLabelText('Authentication code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    // Omar is in Finance: no audit log, no admin page, no settings, no support.
    const nav = await primaryNav();
    await screen.findByRole('button', { name: 'Account menu for Omar T.' });
    const links = nav.getAllByRole('link').map((link) => link.textContent);
    expect(links).toContain('Finance');
    expect(links).not.toContain('Audit log');
    expect(links).not.toContain('Admins & access');
    expect(links).not.toContain('Settings');
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
