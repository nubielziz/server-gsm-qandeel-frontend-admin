// Tests for the Ranks view, run through the whole app against the dev mock API: the table (kind, discount, credit, deposit limit, accounts as a
// link, the square-pen link to the edit view), the With selected strip (Delete counts only ranks with no account that are not retail, asks
// first and shows the server's refusal), the footer pager, the states, and the roles. Ports the groups tab cases of the old merchants page.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { createRank, listRanks } from '../../api';
import { installAccountMocks } from '../../test/installAccountMocks';
import { makeRank, sentRequests } from './ranksTestKit';
import { currentLink, renderAccounts, stripTabs, viewLinks } from '../../pages/test-utils';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and every flow goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

const RANKS = '/accounts?view=ranks';

const ranksTable = () => screen.findByRole('table', { name: 'Ranks' }, { timeout: 10_000 });
const cellTexts = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

// The row of a rank, once the table has drawn it.
async function rankRow(name: string) {
  const cell = await within(await ranksTable()).findByText(name);
  const row = cell.closest('tr');
  if (!row) throw new Error(`No row holds "${name}".`);
  return row;
}

// The names of the ranks, top to bottom (the bold first line of the name cell).
async function rankNames(): Promise<string[]> {
  const rows = within(await ranksTable())
    .getAllByRole('row')
    .slice(1);
  return rows.map(
    (row) => within(row).getAllByRole('cell')[1].querySelector('span.font-medium')?.textContent ?? '',
  );
}

describe('the table', () => {
  it('lists the ranks in the server’s order with the kind, discount, credit, deposit limit and accounts', async () => {
    await renderAccounts(RANKS);
    await waitFor(async () =>
      expect(await rankNames()).toEqual(['Standard', 'Wholesale', 'VIP', 'Storefront retail']),
    );
    const counts = Object.fromEntries(
      (await listRanks()).data.map((rank) => [rank.name, String(rank.accountCount)]),
    );
    expect(
      within(await ranksTable())
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['', 'Rank', 'Kind', 'Discount', 'Credit', 'Deposit limit', 'Accounts', 'Action']);

    expect(cellTexts(await rankRow('Standard'))).toEqual([
      '',
      'Standardnew merchants start here',
      'Merchant',
      '0%',
      'No',
      '$5,000',
      counts.Standard,
      '',
    ]);
    expect(cellTexts(await rankRow('Wholesale'))).toEqual([
      '',
      'Wholesale',
      'Merchant',
      '4%',
      'Allowed',
      '$20,000',
      counts.Wholesale,
      '',
    ]);
    expect(cellTexts(await rankRow('VIP')).slice(2, 6)).toEqual(['Merchant', '8%', 'Allowed', '$100,000']);
  });

  it('says that the retail rank is the shop’s own, with no discount', async () => {
    await renderAccounts(RANKS);
    const row = cellTexts(await rankRow('Storefront retail'));
    expect(row.slice(1, 6)).toEqual([
      "Storefront retailthe shop's rank, always there",
      'Retail',
      '–',
      'No',
      '$1,000',
    ]);
  });

  it('links each count to the accounts of that rank and each pencil to its edit view', async () => {
    await renderAccounts(RANKS);
    const standard = within(await rankRow('Standard'));
    const ranks = (await listRanks()).data;
    const count = String(ranks.find((rank) => rank.name === 'Standard')?.accountCount);
    expect(standard.getByRole('link', { name: count })).toHaveAttribute(
      'href',
      '/accounts?chip=merchants&rank=1',
    );
    expect(standard.getByRole('link', { name: 'Edit Standard' })).toHaveAttribute(
      'href',
      '/accounts?view=edit-rank&id=1',
    );
    const retail = within(await rankRow('Storefront retail'));
    expect(retail.getByRole('link', { name: /^\d+$/ })).toHaveAttribute(
      'href',
      '/accounts?chip=retail&rank=4',
    );
  });

  it('shows a rank with no account with a plain 0, not a link', async () => {
    await makeRank('Reseller');
    await renderAccounts(RANKS);
    const row = await rankRow('Reseller');
    expect(cellTexts(row).slice(1, 7)).toEqual(['Reseller', 'Merchant', '6%', 'Allowed', '$50,000', '0']);
    expect(within(row).queryByRole('link', { name: '0' })).not.toBeInTheDocument();
  });

  it('draws the Ranks link as the current view and raises no tab of the strip', async () => {
    await renderAccounts(RANKS);
    expect(currentLink(await viewLinks())).toBe('Ranks');
    expect(currentLink(await stripTabs())).toBeUndefined();
  });

  it('shows no upgrade threshold, even from a server that still sends one', async () => {
    mockServer.use(
      http.get('*/admin/client-groups', () =>
        HttpResponse.json(
          [
            {
              id: 1,
              name: 'Standard',
              kind: 'b2b',
              rankKind: 'merchant',
              discountPercent: '0.0000',
              isDefault: true,
              earnThreshold: '7777.0000',
              depositLimit: '5000.0000',
              overdraftAllowed: false,
              sort: 1,
              createdAt: '2026-01-01T00:00:00.000Z',
              accountCount: 2,
            },
          ],
          { headers: { 'x-total-count': '1' } },
        ),
      ),
    );
    await renderAccounts(RANKS);
    const table = within(await ranksTable());
    expect(await table.findByText('Standard')).toBeInTheDocument();
    expect(table.queryByText('Upgrade threshold')).not.toBeInTheDocument();
    expect(table.queryByText(/7,777/)).not.toBeInTheDocument();
  });
});

describe('Delete', () => {
  it('is off until a rank is ticked, and counts only the ranks with no account that are not retail', async () => {
    const user = userEvent.setup();
    await makeRank('Reseller');
    await renderAccounts(RANKS);
    const remove = await screen.findByRole('button', { name: 'Delete' });
    expect(remove).toBeDisabled();

    // The retail rank can never go.
    await user.click(within(await rankRow('Storefront retail')).getByRole('checkbox'));
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('title', 'The retail rank cannot be deleted');
    await user.click(within(await rankRow('Storefront retail')).getByRole('checkbox'));

    // A rank with accounts must be emptied first.
    await user.click(within(await rankRow('VIP')).getByRole('checkbox'));
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('title', 'Move its accounts to another rank first');

    // One rank that can go makes the button work, and it counts that rank only.
    await user.click(within(await rankRow('Reseller')).getByRole('checkbox'));
    expect(remove).toBeEnabled();
    expect(remove).not.toHaveAttribute('title');
    await user.click(remove);
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete 1 rank?' }));
    expect(dialog.getByText('Reseller')).toBeInTheDocument();
    expect(dialog.getByText(/VIP: Move its accounts to another rank first/)).toBeInTheDocument();
  });

  it('asks first, then deletes the rank and shows the table without it', async () => {
    const user = userEvent.setup();
    await makeRank('Reseller');
    await renderAccounts(RANKS);
    await user.click(within(await rankRow('Reseller')).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete 1 rank?' }));
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await rankRow('Reseller')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Delete 1 rank?' })).getByRole('button', {
        name: 'Delete rank',
      }),
    );
    expect(await screen.findByText('Reseller rank deleted')).toBeInTheDocument();
    await waitFor(async () =>
      expect(await rankNames()).toEqual(['Standard', 'Wholesale', 'VIP', 'Storefront retail']),
    );
    // The ticks are cleared with it.
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('deletes several ranks, one call each', async () => {
    const user = userEvent.setup();
    await makeRank('Reseller');
    await makeRank('Trade');
    await renderAccounts(RANKS);
    await user.click(within(await rankRow('Reseller')).getByRole('checkbox'));
    await user.click(within(await rankRow('Trade')).getByRole('checkbox'));
    const sent = sentRequests('DELETE');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete 2 ranks?' }));
    await user.click(dialog.getByRole('button', { name: 'Delete ranks' }));
    expect(await screen.findByText('2 ranks deleted')).toBeInTheDocument();
    expect(sent().map((request) => request.url.split('/').pop())).toEqual(['5', '6']);
  });

  it('shows the server’s refusal in a summary and keeps the rank', async () => {
    const user = userEvent.setup();
    await makeRank('Reseller');
    mockServer.use(
      http.delete('*/admin/client-groups/:id', () =>
        problem(
          409,
          'GROUP_IN_USE',
          'The rank still has accounts',
          'Move the 2 accounts in it to another rank first.',
        ),
      ),
    );
    await renderAccounts(RANKS);
    await user.click(within(await rankRow('Reseller')).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Delete 1 rank?' })).getByRole('button', {
        name: 'Delete rank',
      }),
    );
    const summary = within(await screen.findByRole('dialog', { name: '0 of 1 rank deleted' }));
    expect(summary.getByText(/Move the 2 accounts in it to another rank first\./)).toBeInTheDocument();
    expect(summary.getByText('Reseller')).toBeInTheDocument();
    await user.click(summary.getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(await rankRow('Reseller')).toBeTruthy();
  });

  it('is off, with the permission named, for a role that cannot delete ranks', async () => {
    await renderAccounts(RANKS, { permissions: ['groups:read'] });
    const remove = await screen.findByRole('button', { name: 'Delete' });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('title', 'You need the groups:delete permission');
    // Reading the ranks still opens the edit view.
    expect(await screen.findByRole('link', { name: 'Edit VIP' })).toBeInTheDocument();
  });
});

describe('the footer', () => {
  it('pages the ranks in the browser, with the page and the size in the address', async () => {
    const user = userEvent.setup();
    await signInAs();
    for (let n = 1; n <= 22; n += 1) {
      await createRank({
        name: `Rank ${String(n).padStart(2, '0')}`,
        discountPercent: '1',
        depositLimit: '0.0000',
        overdraftAllowed: false,
        isDefault: false,
      });
    }
    const app = await renderAccounts(`${RANKS}&size=25`);
    await waitFor(async () => expect(await rankNames()).toHaveLength(25));
    expect(screen.getByText('Results: 1 - 25 of 26')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?view=ranks&page=2&size=25'));
    await waitFor(async () => expect(await rankNames()).toEqual(['Rank 22']));
    expect(screen.getByText('Results: 26 - 26 of 26')).toBeInTheDocument();
  });

  it('keeps the ticks to the page they were made on', async () => {
    const user = userEvent.setup();
    await makeRank('Reseller');
    await renderAccounts(RANKS);
    await user.click(within(await rankRow('Reseller')).getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    await user.selectOptions(screen.getByRole('combobox', { name: /Page size/ }), '25');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled());
  });

  it('moves an address past the end to the last page', async () => {
    const app = await renderAccounts(`${RANKS}&page=9`);
    await waitFor(() => expect(app.location()).toBe(RANKS));
    await waitFor(async () => expect(await rankNames()).toHaveLength(4));
  });

  it('reads a damaged address as the first page of the default size', async () => {
    await renderAccounts(`${RANKS}&page=zero&size=7`);
    await waitFor(async () => expect(await rankNames()).toHaveLength(4));
    expect(screen.getByText('Results: 1 - 4 of 4')).toBeInTheDocument();
  });
});

describe('the states', () => {
  it('says so, with a Retry, when the ranks could not be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/client-groups', () => problem(403, 'FORBIDDEN', 'No access', 'Ranks are closed.'), {
        once: true,
      }),
    );
    await renderAccounts(RANKS);
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Could not load the ranks' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ranks are closed.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(async () => expect(await rankNames()).toHaveLength(4));
  });

  it('opens for a role that reads only the ranks, with no account call', async () => {
    let accountCalls = 0;
    mockServer.use(
      http.get('*/admin/clients', () => {
        accountCalls += 1;
        return HttpResponse.json([], { headers: { 'x-total-count': '0' } });
      }),
    );
    await renderAccounts('/accounts', { role: 'groupsOnly' });
    await waitFor(async () => expect(await rankNames()).toHaveLength(4));
    expect(accountCalls).toBe(0);
  });
});

describe('an empty table', () => {
  it('links to Add Rank from the empty table of a role that may create ranks', async () => {
    mockServer.use(
      http.get('*/admin/client-groups', () => HttpResponse.json([], { headers: { 'x-total-count': '0' } })),
    );
    await renderAccounts(RANKS);
    expect(await screen.findByRole('heading', { level: 3, name: 'No ranks yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add a rank' })).toHaveAttribute(
      'href',
      '/accounts?view=add-rank',
    );
  });
});
