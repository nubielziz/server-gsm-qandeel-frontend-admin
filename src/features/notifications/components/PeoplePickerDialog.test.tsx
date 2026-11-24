// Tests for the people picker of the composer, run through the whole app against the dev mock API: the tabs a role may use, the ticks that survive paging, search
// and tab changes, the picked people shown as removable rows with a count, and "Exclude people".
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { openNotifications, recordRequests } from '../test/notificationsPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

type Session = Awaited<ReturnType<typeof openComposer>>;

async function openComposer(options: { permissions?: string[] } = {}) {
  const user = userEvent.setup();
  await openNotifications('/notifications', options);
  await user.click(screen.getByRole('button', { name: 'New campaign' }));
  const composer = within(await screen.findByRole('dialog', { name: 'New campaign' }));
  return { user, composer };
}

async function openPicker({ user, composer }: Session, button = 'Add people', title = 'Add people') {
  await user.click(composer.getByRole('button', { name: button }));
  return within(await screen.findByRole('dialog', { name: title }));
}

/** The data rows of the table the picker shows. */
const rowsOf = (picker: ReturnType<typeof within>) => picker.getAllByRole('row').slice(1);
const tickOf = (row: HTMLElement) => within(row).getByRole('checkbox') as HTMLInputElement;

/**
 * The data rows of the list of one kind, once they have arrived. The picker keeps the rows of the tab it came from on screen until the new list is
 * read, and draws placeholder rows before the first read, so a row count proves nothing: an account has a rank and a staff member has none, and a
 * placeholder row has no name. Waits as long as a busy machine needs, so a test never reads or ticks a row of the wrong list.
 */
async function listedRows(picker: ReturnType<typeof within>, kind: 'account' | 'staff') {
  await waitFor(
    () => {
      const rows = rowsOf(picker);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const [, name, rank] = within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent ?? '');
        expect(name).not.toBe('');
        expect(rank !== '').toBe(kind === 'account');
      }
    },
    { timeout: 10_000 },
  );
  return rowsOf(picker);
}

describe('the tabs', () => {
  it('has Staff and Accounts for a role that may read both', async () => {
    const picker = await openPicker(await openComposer());
    expect(picker.getAllByRole('tab').map((tab) => tab.textContent?.replace(/\d+$/, ''))).toEqual([
      'Staff',
      'Accounts',
    ]);
    expect(await picker.findByRole('table', { name: 'Staff' })).toBeInTheDocument();
  });

  it('hides the tab of a list the role may not read', async () => {
    const picker = await openPicker(
      await openComposer({
        permissions: ['dashboard:read', 'broadcasts:read', 'broadcasts:send', 'clients:read'],
      }),
    );
    expect(picker.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Accounts0']);
    expect(await picker.findByRole('table', { name: 'Accounts' })).toBeInTheDocument();
  });

  it('disables the buttons when the role may read none of the lists, and says why', async () => {
    const { composer } = await openComposer({
      permissions: ['dashboard:read', 'broadcasts:read', 'broadcasts:send'],
    });
    for (const name of ['Add people', 'Exclude people']) {
      expect(composer.getByRole('button', { name })).toBeDisabled();
      expect(composer.getByRole('button', { name })).toHaveAttribute(
        'title',
        expect.stringMatching(/staff:read or clients:read/),
      );
    }
  });
});

const RETAIL_RANK = {
  id: 4,
  name: 'Storefront retail',
  kind: 'retail',
  discountPercent: '0',
  creditAllowed: false,
};
const MERCHANT_RANK = {
  id: 2,
  name: 'Wholesale',
  kind: 'merchant',
  discountPercent: '4',
  creditAllowed: true,
};

describe('an account with no name', () => {
  it('is listed by their email, said once, so the row is never blank', async () => {
    mockServer.use(
      http.get('*/admin/clients', () =>
        HttpResponse.json(
          [
            { id: 105, name: '', email: 'maya@example.com', company: '', rank: RETAIL_RANK },
            { id: 106, name: 'Daniel Whitmore', email: 'daniel@example.com', company: '', rank: RETAIL_RANK },
            {
              id: 2,
              name: 'Zain',
              email: 'ops@zain.example',
              company: 'Zain Mobile Hub',
              rank: MERCHANT_RANK,
            },
          ],
          { headers: { 'x-total-count': '3', 'access-control-expose-headers': 'x-total-count' } },
        ),
      ),
    );
    const session = await openComposer();
    const picker = await openPicker(session);
    await session.user.click(picker.getByRole('tab', { name: /Accounts/ }));
    const table = within(await picker.findByRole('table', { name: 'Accounts' }));
    const nameless = within((await table.findAllByText('maya@example.com'))[0].closest('tr') as HTMLElement);
    expect(nameless.getAllByText('maya@example.com')).toHaveLength(1);
    expect(nameless.getByText('maya@example.com')).toHaveClass('font-medium');
    // An account with a name keeps the name and shows the email in its own column, with the rank it holds.
    const named = within(table.getByText('Daniel Whitmore').closest('tr') as HTMLElement);
    expect(named.getByText('daniel@example.com')).toBeInTheDocument();
    expect(named.getByText('Storefront retail')).toBeInTheDocument();
  });

  it('is named by its company when it holds a merchant rank', async () => {
    mockServer.use(
      http.get('*/admin/clients', () =>
        HttpResponse.json(
          [
            {
              id: 2,
              name: 'Zain',
              email: 'ops@zain.example',
              company: 'Zain Mobile Hub',
              rank: MERCHANT_RANK,
            },
          ],
          { headers: { 'x-total-count': '1', 'access-control-expose-headers': 'x-total-count' } },
        ),
      ),
    );
    const session = await openComposer();
    const picker = await openPicker(session);
    await session.user.click(picker.getByRole('tab', { name: /Accounts/ }));
    const table = within(await picker.findByRole('table', { name: 'Accounts' }));
    const row = within((await table.findByText('Zain Mobile Hub')).closest('tr') as HTMLElement);
    expect(row.getByText('Wholesale')).toBeInTheDocument();
    expect(row.getByText('ops@zain.example')).toBeInTheDocument();
  });
});

describe('the ticks', () => {
  it('survive the next page, a search and another tab', async () => {
    const session = await openComposer();
    const picker = await openPicker(session);
    const { user } = session;
    await user.click(picker.getByRole('tab', { name: /Accounts/ }));
    await picker.findByRole('table', { name: 'Accounts' });
    const accounts = await listedRows(picker, 'account');
    expect(accounts.length).toBeGreaterThan(1);
    const first = accounts[0];
    const firstName = within(first).getAllByRole('cell')[1].textContent as string;
    await user.click(tickOf(first));
    expect(picker.getByText('1 picked')).toBeInTheDocument();

    // The next page: tick another account there.
    await user.click(picker.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(
        within(picker.getByRole('table', { name: 'Accounts' })).queryByText(firstName),
      ).not.toBeInTheDocument(),
    );
    const second = rowsOf(within(picker.getByRole('table', { name: 'Accounts' })))[0];
    await user.click(tickOf(second));
    expect(picker.getByText('2 picked')).toBeInTheDocument();

    // Back on page 1 the first account is still ticked.
    await user.click(picker.getByRole('button', { name: 'Previous page' }));
    const again = await within(picker.getByRole('table', { name: 'Accounts' })).findByText(
      firstName,
      undefined,
      { timeout: 10_000 },
    );
    expect(tickOf(again.closest('tr') as HTMLElement).checked).toBe(true);

    // Another tab keeps the count, and ticks there add to it.
    await user.click(picker.getByRole('tab', { name: /Staff/ }));
    await picker.findByRole('table', { name: 'Staff' });
    const [member] = await listedRows(picker, 'staff');
    await user.click(tickOf(member));
    expect(picker.getByText('3 picked')).toBeInTheDocument();
    await user.click(picker.getByRole('tab', { name: /Accounts/ }));
    expect(picker.getByRole('tab', { name: /Accounts/ })).toHaveTextContent('2');

    // A search that finds the first account shows it ticked.
    await user.type(picker.getByRole('searchbox', { name: 'Search accounts' }), firstName.split(' ')[0]);
    const found = await within(picker.getByRole('table', { name: 'Accounts' })).findByText(
      firstName,
      undefined,
      { timeout: 10_000 },
    );
    expect(tickOf(found.closest('tr') as HTMLElement).checked).toBe(true);
  });

  it('send the search to the server and go back to page 1', async () => {
    const sent = recordRequests('/admin/clients');
    const session = await openComposer();
    const picker = await openPicker(session);
    await session.user.click(picker.getByRole('tab', { name: /Accounts/ }));
    await picker.findByRole('table', { name: 'Accounts' });
    // The pager renders only after the list and its x-total-count have loaded: wait for it, never get it at once.
    await session.user.click(await picker.findByRole('button', { name: 'Next page' }, { timeout: 5_000 }));
    await waitFor(() => expect(sent.at(-1)?.url.searchParams.get('_start')).toBe('10'));
    await session.user.type(picker.getByRole('searchbox', { name: 'Search accounts' }), 'an');
    await waitFor(() => expect(sent.at(-1)?.url.searchParams.get('q')).toBe('an'), { timeout: 5_000 });
    expect(sent.at(-1)?.url.searchParams.get('_start')).toBe('0');
  });
});

describe('Done', () => {
  it('shows the picked people as removable rows with a count, and Remove takes one off', async () => {
    const session = await openComposer();
    const { user, composer } = session;
    const picker = await openPicker(session);
    await picker.findByRole('table', { name: 'Staff' });
    const rows = await listedRows(picker, 'staff');
    expect(rows.length).toBeGreaterThan(1);
    const names = [0, 1].map((index) => within(rows[index]).getAllByRole('cell')[1].textContent as string);
    await user.click(tickOf(rows[0]));
    await user.click(tickOf(rows[1]));
    await user.click(picker.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog', { name: 'Add people' })).not.toBeInTheDocument();

    const list = within(composer.getByRole('region', { name: 'Added people' }));
    expect(list.getByText('2')).toBeInTheDocument();
    for (const name of names) expect(list.getByText(name)).toBeInTheDocument();
    await user.click(list.getByRole('button', { name: `Remove ${names[0]}` }));
    expect(list.queryByText(names[0])).not.toBeInTheDocument();
    expect(list.getByText(names[1])).toBeInTheDocument();
  });

  it('shows an added account with the rank it holds, under its name', async () => {
    const session = await openComposer();
    const { user, composer } = session;
    const picker = await openPicker(session);
    await user.click(picker.getByRole('tab', { name: /Accounts/ }));
    await picker.findByRole('table', { name: 'Accounts' });
    const [row] = await listedRows(picker, 'account');
    const [, name, rank] = within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent as string);
    expect(rank).not.toBe('');
    await user.click(tickOf(row));
    await user.click(picker.getByRole('button', { name: 'Done' }));
    const list = within(composer.getByRole('region', { name: 'Added people' }));
    expect(list.getByText(name)).toBeInTheDocument();
    expect(list.getByText(new RegExp(`^${rank}`))).toBeInTheDocument();
    expect(list.queryByText(/^Account/)).not.toBeInTheDocument();
  });

  it('starts from the people already added, so ticks can be taken back', async () => {
    const session = await openComposer();
    const { user, composer } = session;
    let picker = await openPicker(session);
    await picker.findByRole('table', { name: 'Staff' });
    await user.click(tickOf((await listedRows(picker, 'staff'))[0]));
    await user.click(picker.getByRole('button', { name: 'Done' }));
    picker = await openPicker(session);
    const again = await picker.findByRole('table', { name: 'Staff' });
    await waitFor(() => expect(tickOf(rowsOf(within(again))[0]).checked).toBe(true));
    expect(picker.getByText('1 picked')).toBeInTheDocument();
    await user.click(tickOf(rowsOf(within(again))[0]));
    await user.click(picker.getByRole('button', { name: 'Done' }));
    expect(
      within(composer.getByRole('region', { name: 'Added people' })).queryByRole('button', {
        name: /^Remove/,
      }),
    ).not.toBeInTheDocument();
  });

  it('leaves the list unchanged when the dialog is cancelled', async () => {
    const session = await openComposer();
    const picker = await openPicker(session);
    await picker.findByRole('table', { name: 'Staff' });
    await session.user.click(tickOf((await listedRows(picker, 'staff'))[0]));
    await session.user.click(picker.getByRole('button', { name: 'Cancel' }));
    expect(
      within(session.composer.getByRole('region', { name: 'Added people' })).queryByRole('button', {
        name: /^Remove/,
      }),
    ).not.toBeInTheDocument();
  });

  it('fills the "Left out" list from Exclude people, and keeps the two lists apart', async () => {
    const session = await openComposer();
    const { user, composer } = session;
    const picker = await openPicker(session, 'Exclude people', 'Leave out people');
    await picker.findByRole('table', { name: 'Staff' });
    await user.click(tickOf((await listedRows(picker, 'staff'))[0]));
    await user.click(picker.getByRole('button', { name: 'Done' }));
    expect(
      within(composer.getByRole('region', { name: 'Left out' })).getAllByRole('button', { name: /^Remove/ }),
    ).toHaveLength(1);
    expect(
      within(composer.getByRole('region', { name: 'Added people' })).queryByRole('button', {
        name: /^Remove/,
      }),
    ).not.toBeInTheDocument();
  });
});
