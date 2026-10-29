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
      merchants: { count: 2 },
    });
    const orders = screen.getByRole('link', { name: /^Orders/ });
    expect(within(orders).getByText('43')).toHaveClass('count');
    expect(within(orders).getByText('17 past SLA')).toHaveClass('sr-only');
    expect(orders.querySelector('.dot')).toHaveAttribute('aria-hidden', 'true');

    expect(
      within(screen.getByRole('link', { name: /^Support/ })).getByText('3 past the reply target'),
    ).toBeInTheDocument();

    const merchants = screen.getByRole('link', { name: /^Merchants/ });
    expect(within(merchants).getByText('2')).toBeInTheDocument();
    expect(merchants.querySelector('.dot')).toBeNull();
  });

  it('shows nothing for a zero count or an unknown page', () => {
    renderNav({ finance: { count: 0, late: 2 }, nowhere: { count: 9 } });
    expect(screen.getByRole('link', { name: 'Finance' })).toBeInTheDocument();
    expect(screen.queryByText('9')).not.toBeInTheDocument();
  });

  it('leaves out a group with no page', () => {
    renderNav(
      {},
      PAGES.filter((page) => page.meta.group === 'Money'),
    );
    expect(screen.getByText('Money')).toBeInTheDocument();
    expect(screen.queryByText('Operations')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('tells the shell when a link is followed', async () => {
    const onNavigate = vi.fn();
    renderNav({}, PAGES, onNavigate);
    await userEvent.click(screen.getByRole('link', { name: 'Finance' }));
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
