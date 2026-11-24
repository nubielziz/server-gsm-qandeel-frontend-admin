// Tests for the Prices part of an account's record, run through the whole app against the dev mock API: the rank and what it means for prices,
// the fixed prices with their base, rank and floor prices, the footer pager, the states (none yet, a failed read), and what each missing
// permission turns off.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { installAccountMocks } from '../../test/installAccountMocks';
import { fixedPrice, openPrices, rowOf } from './test-utils';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const listOf = (rows: unknown[]) =>
  http.get('*/admin/client-prices', () =>
    HttpResponse.json(rows, { headers: { 'x-total-count': String(rows.length) } }),
  );

describe('the rank and the fixed prices', () => {
  it('names the rank, its discount and what the account pays without a fixed price', async () => {
    await openPrices();
    expect(within(await screen.findByRole('group', { name: 'Rank' })).getByText('VIP')).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Rank discount' })).getByText('8% off base prices'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Without a fixed price' })).getByText('pays the VIP price'),
    ).toBeInTheDocument();
    expect(screen.getByText('A fixed price beats every other rule for this account.')).toBeInTheDocument();
  });

  it('shows each fixed price with the base price, the rank price and the floor', async () => {
    await openPrices();
    const row = await rowOf('Fixed prices', 'iCloud Clean / Lost Check');
    expect(row.getByText('IMEI')).toBeInTheDocument();
    expect(row.getByText('$0.13')).toBeInTheDocument();
    expect(row.getByText('$0.12')).toBeInTheDocument();
    expect(row.getByText('$0.10', { selector: 'span.font-semibold' })).toBeInTheDocument();
    for (const name of ['Service', 'Base', 'Rank price', 'Fixed price', 'Floor']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    }
  });

  it('shows the note of a fixed price under its price', async () => {
    mockServer.use(listOf([fixedPrice(1, { note: 'Volume deal' })]));
    await openPrices();
    const row = await rowOf('Fixed prices', 'Service 1');
    expect(row.getByText('Volume deal')).toBeInTheDocument();
  });

  it('says what the account pays when it has no fixed price, with its own rank named', async () => {
    await openPrices({}, 2, /Al-Noor Telecom/);
    expect(
      await screen.findByText('No fixed prices. This account pays the Wholesale price on every service.'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Without a fixed price' })).getByText(
        'pays the Wholesale price',
      ),
    ).toBeInTheDocument();
  });

  it('ends with the footer pager', async () => {
    await openPrices();
    await rowOf('Fixed prices', 'iCloud Clean / Lost Check');
    expect(screen.getByText('Results: 1 - 1 of 1')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  it('pages the fixed prices in the browser, 50 to a page', async () => {
    const user = userEvent.setup();
    mockServer.use(listOf(Array.from({ length: 60 }, (_, index) => fixedPrice(index + 1))));
    await openPrices();
    const table = within(await screen.findByRole('table', { name: 'Fixed prices' }));
    expect(screen.getByText('Results: 1 - 50 of 60')).toBeInTheDocument();
    expect(table.getAllByRole('row')).toHaveLength(51);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Results: 51 - 60 of 60')).toBeInTheDocument();
    expect(table.getAllByRole('row')).toHaveLength(11);
  });

  it('shows an error with Retry when the fixed prices cannot be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/client-prices', () => HttpResponse.json({ title: 'Broken' }, { status: 400 })),
    );
    await openPrices();
    expect(await screen.findByText('Could not load the fixed prices')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Could not load the fixed prices')).toBeInTheDocument();
  });
});

describe('what a missing permission turns off', () => {
  it('turns Add, Edit and Remove off for a role that can only read prices, naming each permission', async () => {
    await openPrices({ permissions: ['clients:read', 'pricing:read'] });
    const add = await screen.findByRole('button', { name: 'Add fixed price…' });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('title', 'You need the pricing:create permission');
    const edit = await screen.findByRole('button', {
      name: 'Edit the fixed price of iCloud Clean / Lost Check',
    });
    expect(edit).toBeDisabled();
    expect(edit).toHaveAttribute('title', 'You need the pricing:update permission');
    const remove = screen.getByRole('button', {
      name: 'Remove the fixed price of iCloud Clean / Lost Check',
    });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('title', 'You need the pricing:delete permission');
  });

  it('leaves them on for the Owner', async () => {
    await openPrices();
    expect(await screen.findByRole('button', { name: 'Add fixed price…' })).toBeEnabled();
    expect(
      await screen.findByRole('button', { name: 'Edit the fixed price of iCloud Clean / Lost Check' }),
    ).toBeEnabled();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Remove the fixed price of iCloud Clean / Lost Check' }),
      ).toBeEnabled(),
    );
  });
});
