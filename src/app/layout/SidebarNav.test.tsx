// Tests for the sidebar link list: grouping and the count chips with their red "past deadline" dot.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { resources, toPageResource, type PageResource } from '../resources';
import { SidebarNav } from './SidebarNav';
import type { NavCounts } from './useNavCounts';

const PAGES = resources.map(toPageResource).filter((page): page is PageResource => page !== undefined);

function renderNav(counts: NavCounts, pages: readonly PageResource[] = PAGES, onNavigate = () => {}) {
  return render(
    <MemoryRouter initialEntries={['/orders']}>
      <SidebarNav pages={pages} counts={counts} onNavigate={onNavigate} />
    </MemoryRouter>,
  );
}

describe('SidebarNav', () => {
  it('shows a neutral count chip beside the page, and a dot with words when some items are late', () => {
    renderNav({
      orders: { count: 43, late: 17 },
      support: { count: 10, late: 3, lateLabel: 'past the reply target' },
      money: { count: 2 },
    });
    const orders = screen.getByRole('link', { name: /^Orders/ });
    expect(within(orders).getByText('43')).toHaveClass('count');
    expect(within(orders).getByText('17 past SLA')).toHaveClass('sr-only');
    expect(orders.querySelector('.dot')).toHaveAttribute('aria-hidden', 'true');

    expect(
      within(screen.getByRole('link', { name: /^Support/ })).getByText('3 past the reply target'),
    ).toBeInTheDocument();

    const money = screen.getByRole('link', { name: /^Money/ });
    expect(within(money).getByText('2')).toBeInTheDocument();
    expect(money.querySelector('.dot')).toBeNull();
  });

  it('lists one Accounts entry in Operations, after Orders, in the place of Merchants and Customers', () => {
    renderNav({});
    const operations = PAGES.filter((page) => page.meta.group === 'Operations').map(
      (page) => page.meta.label,
    );
    expect(operations.slice(0, 3)).toEqual(['Dashboard', 'Orders', 'Accounts']);
    expect(screen.getAllByRole('link', { name: 'Accounts' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts');
    expect(screen.queryByRole('link', { name: /^Merchants/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Customers/ })).not.toBeInTheDocument();
  });

  it('shows no count chip beside Accounts when no count is given for it', () => {
    renderNav({ orders: { count: 4 } });
    const accounts = screen.getByRole('link', { name: 'Accounts' });
    expect(accounts.querySelector('.count')).toBeNull();
    expect(accounts.querySelector('.dot')).toBeNull();
  });

  it('shows Accounts alone for a role that may open only that page', () => {
    const accounts = PAGES.filter((page) => page.name === 'accounts');
    renderNav({}, accounts);
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Accounts']);
  });

  it('shows nothing for a zero count or an unknown page', () => {
    renderNav({ money: { count: 0, late: 2 }, nowhere: { count: 9 } });
    expect(screen.getByRole('link', { name: 'Money' })).toBeInTheDocument();
    expect(screen.queryByText('9')).not.toBeInTheDocument();
  });

  it('leaves out a group with no page', () => {
    const money = PAGES.filter((page) => page.meta.group === 'Money');
    renderNav({}, money);
    // The group heading and the one page in it are both called Money.
    expect(screen.getByText('Money', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByText('Operations')).not.toBeInTheDocument();
    // Only the pages handed over show, each by its name: no link of another group comes with them.
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(
      money.map((page) => page.meta.label),
    );
    expect(screen.getByRole('link', { name: 'Money' })).toHaveAttribute('href', '/money');
    expect(screen.queryByRole('link', { name: 'Finance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Refunds/ })).not.toBeInTheDocument();
  });

  it('tells the shell when a link is followed', async () => {
    const onNavigate = vi.fn();
    renderNav({}, PAGES, onNavigate);
    await userEvent.click(screen.getByRole('link', { name: 'Money' }));
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
