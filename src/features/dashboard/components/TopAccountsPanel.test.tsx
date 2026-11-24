// Tests of TopAccountsPanel: one table for merchants and storefront buyers, with the rank and the live wallet; each account links to
// the Accounts page by its number; a guest is marked and has no wallet; the channel shown names the list and is what the report is
// asked for. The report hook and the access check are replaced, so only the panel's own words and links are tested.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTopClients } from '../hooks/useTopClients';
import type { DashboardScope, TopAccount } from '../types';
import { TopAccountsPanel } from './TopAccountsPanel';

type Query = { data?: TopAccount[]; isError?: boolean; error?: unknown; refetch?: () => Promise<unknown> };

const state = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  canOpen: true as boolean | undefined,
}));
vi.mock('../hooks/useTopClients', () => ({ useTopClients: vi.fn(() => state.query) }));
vi.mock('@/lib/auth/useCanOpenPage', () => ({ useCanOpenPage: () => state.canOpen }));

const account = (patch: Partial<TopAccount>): TopAccount => ({
  id: 9,
  name: 'Lagos Gadget Fix',
  country: 'NG',
  rank: { id: 2, name: 'Wholesale', kind: 'merchant' },
  hasAccount: true,
  orders: 15,
  spend: '347.5700',
  profit: '31.2700',
  walletBalance: '95.5700',
  ...patch,
});

const ACCOUNTS: TopAccount[] = [
  account({}),
  account({ id: 17, name: 'Sana’a Repair', country: 'YE', walletBalance: '-81.9500' }),
  account({
    id: 107,
    name: 'Daniel Whitmore',
    country: 'GB',
    rank: { id: 4, name: 'Storefront retail', kind: 'retail' },
    walletBalance: '12.0000',
  }),
  account({
    id: 131,
    name: '  ',
    country: 'SE',
    rank: { id: 4, name: 'Storefront retail', kind: 'retail' },
    hasAccount: false,
    walletBalance: '0.0000',
  }),
];

function show(query: Query, scope: DashboardScope = 'all', days: 1 | 7 | 14 = 7) {
  state.query = query;
  return render(
    <MemoryRouter>
      <TopAccountsPanel days={days} scope={scope} />
    </MemoryRouter>,
  );
}

const rowOf = (name: string) => within(screen.getByText(name).closest('tr') as HTMLElement);

beforeEach(() => {
  state.canOpen = true;
  vi.mocked(useTopClients).mockClear();
});

describe('TopAccountsPanel', () => {
  it('lists merchants and storefront buyers in one table with the six columns', () => {
    show({ data: ACCOUNTS });
    expect(screen.getByRole('region', { name: 'Top accounts' })).toBeInTheDocument();
    const table = within(screen.getByRole('table', { name: 'Top accounts by spend' }));
    expect(table.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Account',
      'Rank',
      'Orders',
      'Spend',
      'Profit',
      'Wallet',
    ]);
    expect(table.getAllByRole('row')).toHaveLength(ACCOUNTS.length + 1);
  });

  it('shows the name, country, rank, orders, spend, profit and wallet of an account', () => {
    show({ data: ACCOUNTS });
    const lagos = rowOf('Lagos Gadget Fix');
    expect(lagos.getByText('NG')).toBeInTheDocument();
    expect(lagos.getByText('Wholesale')).toBeInTheDocument();
    expect(lagos.getByText('15')).toBeInTheDocument();
    expect(lagos.getByText('$348')).toBeInTheDocument();
    expect(lagos.getByText('$31')).toBeInTheDocument();
    expect(lagos.getByText('$96')).toBeInTheDocument();
    expect(rowOf('Daniel Whitmore').getByText('Storefront retail')).toBeInTheDocument();
  });

  it('colours only a negative wallet', () => {
    show({ data: ACCOUNTS });
    expect(rowOf('Sana’a Repair').getByText('-$82').closest('td')).toHaveClass('text-crit-fg');
    expect(rowOf('Lagos Gadget Fix').getByText('$96').closest('td')).not.toHaveClass('text-crit-fg');
  });

  it('marks a guest, names a guest with no name by its number and shows no wallet for it', () => {
    show({ data: ACCOUNTS });
    const guest = rowOf('Account #131');
    expect(guest.getByText('Guest')).toBeInTheDocument();
    expect(guest.getByText('–')).toBeInTheDocument();
    expect(guest.queryByText('$0')).not.toBeInTheDocument();
    expect(rowOf('Daniel Whitmore').queryByText('Guest')).not.toBeInTheDocument();
  });

  it('links every account, a merchant or a buyer, to the Accounts page by its number', () => {
    show({ data: ACCOUNTS });
    expect(rowOf('Lagos Gadget Fix').getByRole('link')).toHaveAttribute('href', '/accounts/9');
    expect(rowOf('Daniel Whitmore').getByRole('link')).toHaveAttribute('href', '/accounts/107');
    expect(rowOf('Account #131').getByRole('link')).toHaveAttribute('href', '/accounts/131');
  });

  it('shows plain names when the staff member may not open the Accounts page', () => {
    state.canOpen = false;
    show({ data: ACCOUNTS });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Lagos Gadget Fix')).toHaveClass('font-medium');
  });

  it('names the channel and the period in the line under the title', () => {
    const { unmount } = show({ data: ACCOUNTS }, 'all', 7);
    expect(screen.getByText('By spend, last 7 days')).toBeInTheDocument();
    unmount();
    const merchants = show({ data: ACCOUNTS }, 'b2b', 14);
    expect(screen.getByText('By spend, merchants, last 14 days')).toBeInTheDocument();
    merchants.unmount();
    show({ data: ACCOUNTS }, 'b2c', 1);
    expect(screen.getByText('By spend, the storefront, last 24 hours')).toBeInTheDocument();
  });

  it('asks the report for the period and the channel it shows', () => {
    show({ data: [] }, 'b2c', 14);
    expect(useTopClients).toHaveBeenCalledWith(14, 'b2c');
  });

  it('draws a skeleton while the report loads', () => {
    show({});
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('says so when no account ordered', () => {
    show({ data: [] });
    expect(screen.getByRole('heading', { name: 'No account activity yet' })).toBeInTheDocument();
  });

  it('shows the failure with a Retry that reads the report again', async () => {
    const refetch = vi.fn(() => Promise.resolve());
    show({ isError: true, error: new Error('Reports are not part of your role.'), refetch });
    expect(screen.getByText('Could not load the top accounts')).toBeInTheDocument();
    expect(screen.getByText('Reports are not part of your role.')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
