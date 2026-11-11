// Tests for the people picker of the composer, run through the whole app against the dev mock API: the tabs a role may use, the ticks that survive paging, search
// and tab changes, the picked people shown as removable rows with a count, and "Exclude people".
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

describe('the tabs', () => {
  it('has Staff, Merchants and Customers for a role that may read all three', async () => {
    const picker = await openPicker(await openComposer());
    expect(picker.getAllByRole('tab').map((tab) => tab.textContent?.replace(/\d+$/, ''))).toEqual([
      'Staff',
      'Merchants',
      'Customers',
    ]);
    expect(await picker.findByRole('table', { name: 'Staff' })).toBeInTheDocument();
  });

  it('hides the tab of a list the role may not read', async () => {
    const picker = await openPicker(
      await openComposer({
        permissions: ['dashboard:read', 'broadcasts:read', 'broadcasts:send', 'clients:read'],
      }),
    );
    expect(picker.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Merchants0']);
    expect(await picker.findByRole('table', { name: 'Merchants' })).toBeInTheDocument();
  });

  it('disables the buttons when the role may read none of the lists, and says why', async () => {
    const { composer } = await openComposer({
      permissions: ['dashboard:read', 'broadcasts:read', 'broadcasts:send'],
    });
    for (const name of ['Add people', 'Exclude people']) {
      expect(composer.getByRole('button', { name })).toBeDisabled();
      expect(composer.getByRole('button', { name })).toHaveAttribute(
        'title',
        expect.stringMatching(/staff:read, clients:read or customers:read/),
      );
    }
  });
});

describe('the ticks', () => {
  it('survive the next page, a search and another tab', async () => {
    const session = await openComposer();
    const picker = await openPicker(session);
    const { user } = session;
    await user.click(picker.getByRole('tab', { name: /Customers/ }));
    const table = await picker.findByRole('table', { name: 'Customers' });
    await waitFor(() => expect(rowsOf(within(table)).length).toBeGreaterThan(1));
    const first = rowsOf(within(table))[0];
    const firstName = within(first).getAllByRole('cell')[1].textContent as string;
    await user.click(tickOf(first));
    expect(picker.getByText('1 picked')).toBeInTheDocument();

    // The next page: tick another customer there.
    await user.click(picker.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(
        within(picker.getByRole('table', { name: 'Customers' })).queryByText(firstName),
      ).not.toBeInTheDocument(),
    );
    const second = rowsOf(within(picker.getByRole('table', { name: 'Customers' })))[0];
    await user.click(tickOf(second));
    expect(picker.getByText('2 picked')).toBeInTheDocument();

    // Back on page 1 the first customer is still ticked.
    await user.click(picker.getByRole('button', { name: 'Previous page' }));
    const again = await within(picker.getByRole('table', { name: 'Customers' })).findByText(firstName);
    expect(tickOf(again.closest('tr') as HTMLElement).checked).toBe(true);

    // Another tab keeps the count, and ticks there add to it.
    await user.click(picker.getByRole('tab', { name: /Merchants/ }));
    const merchants = await picker.findByRole('table', { name: 'Merchants' });
    await user.click(tickOf(rowsOf(within(merchants))[0]));
    expect(picker.getByText('3 picked')).toBeInTheDocument();
    await user.click(picker.getByRole('tab', { name: /Customers/ }));
    expect(picker.getByRole('tab', { name: /Customers/ })).toHaveTextContent('2');

    // A search that finds the first customer shows it ticked.
    await user.type(picker.getByRole('searchbox', { name: 'Search customers' }), firstName.split(' ')[0]);
    const found = await within(picker.getByRole('table', { name: 'Customers' })).findByText(
      firstName,
      undefined,
      { timeout: 5_000 },
    );
    expect(tickOf(found.closest('tr') as HTMLElement).checked).toBe(true);
  });

  it('send the search to the server and go back to page 1', async () => {
    const sent = recordRequests('/admin/customers');
    const session = await openComposer();
    const picker = await openPicker(session);
    await session.user.click(picker.getByRole('tab', { name: /Customers/ }));
    await picker.findByRole('table', { name: 'Customers' });
    // The pager renders only after the list and its x-total-count have loaded: wait for it, never get it at once.
    await session.user.click(await picker.findByRole('button', { name: 'Next page' }, { timeout: 5_000 }));
    await waitFor(() => expect(sent.at(-1)?.url.searchParams.get('_start')).toBe('10'));
    await session.user.type(picker.getByRole('searchbox', { name: 'Search customers' }), 'an');
    await waitFor(() => expect(sent.at(-1)?.url.searchParams.get('q')).toBe('an'), { timeout: 5_000 });
    expect(sent.at(-1)?.url.searchParams.get('_start')).toBe('0');
  });
});

describe('Done', () => {
  it('shows the picked people as removable rows with a count, and Remove takes one off', async () => {
    const session = await openComposer();
    const { user, composer } = session;
    const picker = await openPicker(session);
    const table = await picker.findByRole('table', { name: 'Staff' });
    await waitFor(() => expect(rowsOf(within(table)).length).toBeGreaterThan(1));
    const rows = rowsOf(within(table));
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

  it('starts from the people already added, so ticks can be taken back', async () => {
    const session = await openComposer();
    const { user, composer } = session;
    let picker = await openPicker(session);
    const table = await picker.findByRole('table', { name: 'Staff' });
    await waitFor(() => expect(rowsOf(within(table)).length).toBeGreaterThan(0));
    await user.click(tickOf(rowsOf(within(table))[0]));
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
    const table = await picker.findByRole('table', { name: 'Staff' });
    await waitFor(() => expect(rowsOf(within(table)).length).toBeGreaterThan(0));
    await session.user.click(tickOf(rowsOf(within(table))[0]));
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
    const table = await picker.findByRole('table', { name: 'Staff' });
    await waitFor(() => expect(rowsOf(within(table)).length).toBeGreaterThan(0));
    await user.click(tickOf(rowsOf(within(table))[0]));
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
