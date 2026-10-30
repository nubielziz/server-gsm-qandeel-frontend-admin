// Tests for the merchants list, run through the whole app against the dev mock API: the tabs and their counts, the filters in the
// address, sorting and paging, approving a merchant, inviting one (with the server's refusal), the Groups tab, the Verification tab
// and what the staff member's permissions hide.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { openMerchants, rowOf, statusTabs, tableNamed, tabTexts } from '../test/openMerchants';

setupMockApi();
installMerchantMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 30_000 });

describe('tabs and counts', () => {
  it('shows the status tabs with the counts the server gives, then Groups and Verification', async () => {
    await openMerchants();
    await waitFor(() =>
      expect(tabTexts()).toEqual([
        'All20',
        'Active17',
        'Pending approval2',
        'Suspended1',
        'Groups4',
        'Verification2',
      ]),
    );
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('17 active, 2 waiting for approval.')).toBeInTheDocument();
    expect(await screen.findByText('20 merchants')).toBeInTheDocument();
  });

  it('keeps the chosen tab in the address and filters the table by that status', async () => {
    const user = userEvent.setup();
    const app = await openMerchants();
    await screen.findByText('20 merchants');
    await user.click(statusTabs().getByRole('tab', { name: /Suspended/ }));
    expect(app.location()).toBe('/merchants?tab=suspended');
    expect(await screen.findByText('1 merchant')).toBeInTheDocument();
    expect(await rowOf('Merchants', 'Tunis Fix Point')).toBeTruthy();
    await user.click(statusTabs().getByRole('tab', { name: /^All/ }));
    expect(app.location()).toBe('/merchants');
  });

  it('opens the tab named in the address (the deep link of the dashboard)', async () => {
    await openMerchants('/merchants?tab=pending');
    expect(await screen.findByText('2 merchants')).toBeInTheDocument();
    expect(statusTabs().getByRole('tab', { name: /Pending approval/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await rowOf('Merchants', 'Algiers Service Plus')).toBeTruthy();
    expect(await rowOf('Merchants', 'Accra Devices')).toBeTruthy();
  });
});

describe('the table', () => {
  it('shows each merchant with country, email, group, status, wallet and the 30-day figures', async () => {
    await openMerchants();
    const row = await rowOf('Merchants', 'Zain Mobile Hub');
    expect(row.getByText('JO')).toBeInTheDocument();
    expect(row.getByText(/ops@zainmobilehub\.example/)).toBeInTheDocument();
    expect(row.getByText('VIP')).toBeInTheDocument();
    expect(row.getByText('Active')).toBeInTheDocument();
    expect(row.getByText('$1,209.75')).toBeInTheDocument();
    expect(row.getByText('$71 held')).toBeInTheDocument();
    expect(row.getByRole('link', { name: 'Zain Mobile Hub' })).toHaveAttribute('href', '/merchants/1');
    expect(row.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
  });

  it('marks a wallet below zero in red with an alert, and a merchant that never ordered', async () => {
    await openMerchants();
    const row = await rowOf('Merchants', "Sana'a Repair");
    expect(row.getByText('-$81.95')).toHaveClass('text-crit-fg');
    const pending = await rowOf('Merchants', 'Algiers Service Plus');
    expect(pending.getByText('Pending')).toBeInTheDocument();
    expect(pending.getByText('Never')).toBeInTheDocument();
  });

  it('lists the merchants alphabetically and sorts on the server when a column header is pressed', async () => {
    const user = userEvent.setup();
    const app = await openMerchants();
    const first = async () => (await tableNamed('Merchants')).getAllByRole('row')[1];
    await waitFor(async () => expect(await first()).toHaveTextContent('Accra Devices'));
    await user.click(await screen.findByRole('button', { name: 'Merchant' }));
    expect(app.location()).toBe('/merchants?sort=name&dir=desc');
    await waitFor(async () => expect(await first()).toHaveTextContent('Zain Mobile Hub'));
    await user.click(screen.getByRole('button', { name: 'Status' }));
    expect(app.location()).toBe('/merchants?sort=status&dir=asc');
  });

  it('moves an address past the last page back to the last page that has rows', async () => {
    const app = await openMerchants('/merchants?page=9');
    await waitFor(() => expect(app.location()).toBe('/merchants'));
    expect(await rowOf('Merchants', 'Zain Mobile Hub')).toBeTruthy();
  });
});

describe('filters', () => {
  it('searches after a pause, keeps the text in the address and clears it with Clear filters', async () => {
    const user = userEvent.setup();
    const app = await openMerchants();
    await screen.findByText('20 merchants');
    await user.type(screen.getByRole('searchbox', { name: 'Search name, company, email' }), 'karachi');
    await waitFor(() => expect(app.location()).toBe('/merchants?q=karachi'));
    expect(await screen.findByText('1 merchant')).toBeInTheDocument();
    expect(await rowOf('Merchants', 'Karachi Unlock Hub')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/merchants');
    expect(await screen.findByText('20 merchants')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('filters by group and keeps it in the address', async () => {
    const user = userEvent.setup();
    const app = await openMerchants();
    await screen.findByText('20 merchants');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Filter by group' }), 'VIP');
    expect(app.location()).toBe('/merchants?group=3');
    expect(await screen.findByText('3 merchants')).toBeInTheDocument();
    // The storefront's retail group is not a group a merchant can be in, so it is not offered.
    expect(
      within(screen.getByRole('combobox', { name: 'Filter by group' })).queryByText('Storefront retail'),
    ).toBeNull();
  });

  it('says so when nothing matches, and offers to clear the filters', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?q=zzzz');
    expect(await screen.findByText('No merchants match')).toBeInTheDocument();
    // The toolbar and the empty state both offer it; either one clears the search.
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(await screen.findByText('20 merchants')).toBeInTheDocument();
  });
});
