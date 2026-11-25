// Tests for the Money page frame, run through the whole app against the dev mock API: the heading, the strip of tabs, the row of views of
// each tab, what each role is shown, and where an unknown, forbidden or old view lands. They look at the frame only (links, address, landmarks),
// so they hold whether the views are the stubs or the real ones.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import {
  currentLink,
  linkTexts,
  openMoney,
  openMoneyHeading,
  renderInApp,
  stripTabs,
  viewLinks,
} from '../test/moneyPage';
import { MoneyPage } from './MoneyPage';

setupMockApi();
// The page is a lazy chunk (and so are the two view modules): the first test of a run waits for its modules to load, which is slow while the
// whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

describe('the frame', () => {
  it('draws the heading and the five tabs of the strip for the Owner, with the Overview raised', async () => {
    await openMoney();
    expect(screen.getByRole('heading', { level: 1, name: 'Money' })).toBeInTheDocument();
    const strip = await stripTabs();
    expect(linkTexts(strip)).toEqual(['Overview', 'Money in', 'Money back', 'Books', 'Reports']);
    expect(currentLink(strip)).toBe('Overview');
  });

  it('draws no row of views on the Overview', async () => {
    await openMoney();
    expect(screen.getByRole('region', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Views' })).not.toBeInTheDocument();
  });

  it('links each tab to its first view', async () => {
    await openMoney();
    const strip = await stripTabs();
    expect(strip.getByRole('link', { name: /^Overview/ })).toHaveAttribute('href', '/money');
    expect(strip.getByRole('link', { name: /^Money in/ })).toHaveAttribute('href', '/money?view=deposits');
    expect(strip.getByRole('link', { name: /^Money back/ })).toHaveAttribute('href', '/money?view=refunds');
    expect(strip.getByRole('link', { name: /^Books/ })).toHaveAttribute('href', '/money?view=ledger');
    expect(strip.getByRole('link', { name: /^Reports/ })).toHaveAttribute('href', '/money?view=profit');
  });

  it('holds the heading, the two rows of links and the view in one page frame, the view taking what is left', async () => {
    await openMoney('/money?view=ledger');
    const view = await screen.findByRole('region', { name: 'Ledger' });
    const frame = view.parentElement;
    expect(frame).toHaveClass('page-frame');
    expect(frame?.firstElementChild).toContainElement(
      screen.getByRole('heading', { level: 1, name: 'Money' }),
    );
    expect(frame?.lastElementChild).toBe(view);
    expect(view).toHaveClass('flex', 'flex-1', 'flex-col');
  });

  it.each([
    ['ledger', 'Ledger'],
    ['trial-balance', 'Trial balance'],
    ['refunds', 'Refunds'],
    ['disputes', 'Card disputes'],
    ['overview', 'Overview'],
  ])(
    'sets the one gap under the row of links on the section of the %s view, and the view adds none',
    async (view, name) => {
      await openMoney(view === 'overview' ? '/money' : `/money?view=${view}`);
      // The frame's own section (a view can hold regions of its own with the same name).
      const section = await waitFor(() => {
        const found = document.querySelector('.page-frame > section');
        if (!found) throw new Error('The view is not drawn yet.');
        return found;
      });
      expect(section).toHaveAttribute('aria-label', name);
      expect(section).toHaveClass('mt-3');
      // A view draws no top margin of its own, so finance and refunds views sit at the same height.
      await waitFor(() => expect(section.firstElementChild).not.toBeNull());
      expect(section.firstElementChild?.className ?? '').not.toMatch(/(^|\s)mt-\d/);
    },
  );

  it('names the view region after the view on screen', async () => {
    await openMoney('/money?view=trial-balance');
    expect(await screen.findByRole('region', { name: 'Trial balance' })).toBeInTheDocument();
  });
});

describe('the rows of views', () => {
  it('lists Deposits and Shop payments under Money in', async () => {
    await openMoney('/money?view=shop-payments');
    expect(currentLink(await stripTabs())).toBe('Money in');
    const views = await viewLinks();
    expect(linkTexts(views)).toEqual(['Deposits', 'Shop payments']);
    expect(currentLink(views)).toBe('Shop payments');
    expect(views.getByRole('link', { name: /^Deposits/ })).toHaveAttribute('href', '/money?view=deposits');
  });

  it('lists Refunds and Card disputes under Money back', async () => {
    await openMoney('/money?view=disputes');
    expect(currentLink(await stripTabs())).toBe('Money back');
    const views = await viewLinks();
    expect(linkTexts(views)).toEqual(['Refunds', 'Card disputes']);
    expect(currentLink(views)).toBe('Card disputes');
    expect(views.getByRole('link', { name: /^Refunds/ })).toHaveAttribute('href', '/money?view=refunds');
  });

  it('lists the five views of Books for the Owner, with a plus before Issue invoice', async () => {
    await openMoney('/money?view=ledger');
    expect(currentLink(await stripTabs())).toBe('Books');
    const views = await viewLinks();
    expect(linkTexts(views)).toEqual([
      'Ledger',
      'Trial balance',
      'Store balances',
      'Invoices',
      '+Issue invoice',
    ]);
    expect(currentLink(views)).toBe('Ledger');
    expect(views.getByRole('link', { name: 'Issue invoice' })).toHaveAttribute(
      'href',
      '/money?view=issue-invoice',
    );
    expect(views.getByRole('link', { name: 'Trial balance' })).toHaveAttribute(
      'href',
      '/money?view=trial-balance',
    );
  });

  it('keeps Books raised and Issue invoice underlined on its own view', async () => {
    await openMoney('/money?view=issue-invoice');
    expect(currentLink(await stripTabs())).toBe('Books');
    expect(currentLink(await viewLinks())).toBe('+Issue invoice');
    expect(await screen.findByRole('region', { name: 'Issue invoice' })).toBeInTheDocument();
  });

  it('lists the four reports', async () => {
    await openMoney('/money?view=exposure');
    expect(currentLink(await stripTabs())).toBe('Reports');
    const views = await viewLinks();
    expect(linkTexts(views)).toEqual(['Profit', 'Wallet exposure', 'VAT', 'Sales funnel']);
    expect(currentLink(views)).toBe('Wallet exposure');
  });

  it('keeps the parameters of a view in the address, as the view reads them', async () => {
    const app = await openMoney('/money?view=deposits&status=all&payment=7');
    expect(currentLink(await viewLinks())).toBe('Deposits');
    expect(app.location()).toBe('/money?view=deposits&status=all&payment=7');
  });
});

describe('what a role is shown', () => {
  it('shows Issue invoice to a role with invoices:create and clients:read, and not to one without them', async () => {
    await openMoney('/money?view=invoices', {
      permissions: ['invoices:read', 'invoices:create', 'clients:read'],
    });
    expect(linkTexts(await viewLinks())).toEqual(['Invoices', '+Issue invoice']);
  });

  it('leaves Issue invoice out for a role that cannot list the merchants the invoice is for', async () => {
    await openMoney('/money?view=invoices', { permissions: ['invoices:read', 'invoices:create'] });
    expect(linkTexts(await viewLinks())).toEqual(['Invoices']);
  });

  it('shows a role only the tabs and views it may use', async () => {
    await openMoney('/money?view=ledger', { permissions: ['ledger:read'] });
    expect(linkTexts(await stripTabs())).toEqual(['Overview', 'Books']);
    expect(linkTexts(await viewLinks())).toEqual(['Ledger', 'Trial balance']);
  });

  it('lands a role that holds only wallet:read on Store balances, with Books raised, and leaves the bare address alone', async () => {
    const app = await openMoney('/money', { permissions: ['wallet:read'] });
    expect(linkTexts(await stripTabs())).toEqual(['Books']);
    expect(currentLink(await stripTabs())).toBe('Books');
    expect(linkTexts(await viewLinks())).toEqual(['Store balances']);
    expect(await screen.findByRole('region', { name: 'Store balances' })).toBeInTheDocument();
    expect(app.location()).toBe('/money');
  });

  it('lands a role that holds only reports:growth on the Sales funnel', async () => {
    await openMoney('/money', { permissions: ['reports:growth'] });
    expect(linkTexts(await stripTabs())).toEqual(['Reports']);
    expect(currentLink(await viewLinks())).toBe('Sales funnel');
  });

  it('opens Refunds, with Money back raised, for a role that holds only refunds:read', async () => {
    await openMoney('/money?view=refunds', { permissions: ['refunds:read'] });
    expect(linkTexts(await stripTabs())).toEqual(['Overview', 'Money back']);
    expect(currentLink(await stripTabs())).toBe('Money back');
    expect(linkTexts(await viewLinks())).toEqual(['Refunds']);
    expect(currentLink(await viewLinks())).toBe('Refunds');
  });

  it('opens the page with the Overview for that role when the address names no view', async () => {
    await openMoney('/money', { permissions: ['refunds:read'] });
    expect(currentLink(await stripTabs())).toBe('Overview');
    expect(screen.queryByRole('navigation', { name: 'Views' })).not.toBeInTheDocument();
  });

  it('opens the page for a role that holds one of the read permissions only, and refuses a role that holds none', async () => {
    await openMoneyHeading('/money', { permissions: ['orders:read'] });
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Money sections' })).not.toBeInTheDocument();
  });
});

describe('where an address lands', () => {
  it('replaces a report the role may not read with the first report it may, and drops the other keys', async () => {
    const app = await openMoney('/money?view=vat&range=30d', { permissions: ['reports:read'] });
    await waitFor(() => expect(app.location()).toBe('/money?view=profit'));
    expect(currentLink(await stripTabs())).toBe('Reports');
    const views = await viewLinks();
    expect(linkTexts(views)).toEqual(['Profit', 'Wallet exposure']);
    expect(currentLink(views)).toBe('Profit');
  });

  it('replaces a view of a tab the role cannot see with the first view it may use', async () => {
    const app = await openMoney('/money?view=ledger&page=2', { permissions: ['refunds:read'] });
    await waitFor(() => expect(app.location()).toBe('/money'));
    expect(currentLink(await stripTabs())).toBe('Overview');
  });

  it('opens the first view for an unknown view', async () => {
    const app = await openMoney('/money?view=nothing&page=3');
    await waitFor(() => expect(app.location()).toBe('/money'));
    expect(currentLink(await stripTabs())).toBe('Overview');
    expect(screen.queryByRole('navigation', { name: 'Views' })).not.toBeInTheDocument();
  });
});

describe('moving between the tabs', () => {
  it('opens a tab on its first view and keeps the address in step', async () => {
    const user = userEvent.setup();
    const app = await openMoney();
    await user.click((await stripTabs()).getByRole('link', { name: /^Books/ }));
    await waitFor(() => expect(app.location()).toBe('/money?view=ledger'));
    expect(currentLink(await stripTabs())).toBe('Books');
    await user.click((await viewLinks()).getByRole('link', { name: 'Invoices' }));
    await waitFor(() => expect(app.location()).toBe('/money?view=invoices'));
    expect(currentLink(await viewLinks())).toBe('Invoices');
    await user.click((await stripTabs()).getByRole('link', { name: /^Reports/ }));
    await waitFor(() => expect(app.location()).toBe('/money?view=profit'));
    await user.click((await stripTabs()).getByRole('link', { name: 'Overview' }));
    await waitFor(() => expect(app.location()).toBe('/money'));
    expect(screen.queryByRole('navigation', { name: 'Views' })).not.toBeInTheDocument();
  });
});

describe('a role with nothing to see', () => {
  it('shows the heading and a locked message, and no links', async () => {
    await renderInApp(<MoneyPage />, { permissions: ['orders:read'] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Money' })).toBeInTheDocument();
    expect(await screen.findByText('Nothing here for your role')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your role cannot see the ledger, deposits, invoices, reports, refunds or card disputes. Ask an owner if you need access.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
