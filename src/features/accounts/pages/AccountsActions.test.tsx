// Tests for what the list offers to do with an account: the "…" menu of a row (what each role and each account is offered, the dialogs it opens by
// their fixed titles, the one-click password link) and the With selected strip (Suspend, Reactivate and Sign out only, counting the ticked
// accounts each applies to, with the reason when none does). The dialogs themselves have their own tests; these tests assert only the
// title a dialog opens with.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { spy } from '../test/apiSupport';
import { installAccountMocks } from '../test/installAccountMocks';
import { accountNames, accountRow, accountsTable, renderAccounts } from './test-utils';

setupMockApi();
installAccountMocks();
vi.setConfig({ testTimeout: 30_000 });

type User = ReturnType<typeof userEvent.setup>;

// Opens the "…" menu of the row of an account and returns its items by name.
async function openMenu(user: User, name: string) {
  await accountRow(name);
  await user.click(await screen.findByRole('button', { name: `More actions for ${name}` }));
  return within(await screen.findByRole('menu', { name: `Actions for ${name}` }));
}
// The words of each item (a disabled item also carries its reason for assistive technology, in a hidden span after the words).
const itemTexts = (menu: { getAllByRole: (role: 'menuitem') => HTMLElement[] }) =>
  menu.getAllByRole('menuitem').map((item) => item.querySelector('span')?.textContent);

// Closes the dialog that is open (the corner's button and the footer's are both named Close).
async function closeDialog(user: User) {
  await user.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Close' }).at(-1)!);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
}

describe('the row menu', () => {
  it('offers the Owner the actions that fit an active account with a login and a session', async () => {
    const user = userEvent.setup();
    await renderAccounts('/accounts?q=whitmore');
    const menu = await openMenu(user, 'Daniel Whitmore');
    expect(itemTexts(menu)).toEqual([
      'Open',
      'Adjust wallet…',
      'Change rank…',
      'Suspend…',
      'Send a password link',
      'Sign out everywhere',
    ]);
  });

  it('offers a guest the actions that fit: no wallet, no password, no sessions, and Make an account', async () => {
    const user = userEvent.setup();
    await renderAccounts('/accounts?q=alvarez');
    const menu = await openMenu(user, 'Sofia Alvarez');
    expect(itemTexts(menu)).toEqual(['Open', 'Change rank…', 'Suspend…', 'Make an account…']);
    // The rank of a guest does not change: the Owner is told what to do first.
    expect(menu.getByRole('menuitem', { name: /Change rank…/ })).toBeDisabled();
    expect(menu.getByRole('menuitem', { name: /Change rank…/ })).toHaveAttribute(
      'title',
      'Make an account first: a guest keeps the retail rank',
    );
  });

  it('offers Reactivate, not Suspend, for a suspended account, and a password link only once it is active', async () => {
    const user = userEvent.setup();
    await renderAccounts('/accounts?q=weber');
    const menu = await openMenu(user, 'Hannah Weber');
    expect(itemTexts(menu)).toContain('Reactivate…');
    expect(itemTexts(menu)).not.toContain('Suspend…');
    const link = menu.getByRole('menuitem', { name: /Send a password link/ });
    expect(link).toBeDisabled();
    expect(link).toHaveAttribute('title', 'Reactivate the account first');
  });

  it('offers nothing but Open for a blocked account, apart from what its sign-in allows', async () => {
    const user = userEvent.setup();
    await renderAccounts('/accounts?q=turner');
    const menu = await openMenu(user, 'Jack Turner');
    expect(itemTexts(menu)).not.toContain('Suspend…');
    expect(itemTexts(menu)).not.toContain('Reactivate…');
  });

  it('leaves the rank change to the Owner: a manager with every permission is not offered it', async () => {
    const user = userEvent.setup();
    await renderAccounts('/accounts?q=whitmore', { role: 'manager' });
    const menu = await openMenu(user, 'Daniel Whitmore');
    expect(itemTexts(menu)).toEqual([
      'Open',
      'Adjust wallet…',
      'Suspend…',
      'Send a password link',
      'Sign out everywhere',
    ]);
  });

  it('turns off what a reader lacks the permission for, and names the permission', async () => {
    const user = userEvent.setup();
    await renderAccounts('/accounts?q=whitmore', { role: 'reader' });
    const menu = await openMenu(user, 'Daniel Whitmore');
    expect(itemTexts(menu)).toEqual(['Open', 'Suspend…', 'Send a password link', 'Sign out everywhere']);
    const lock = (name: RegExp, title: string) => {
      expect(menu.getByRole('menuitem', { name })).toBeDisabled();
      expect(menu.getByRole('menuitem', { name })).toHaveAttribute('title', title);
    };
    lock(/Suspend…/, 'You need the clients:update and clients:security permission');
    lock(/Send a password link/, 'You need the clients:security permission');
    lock(/Sign out everywhere/, 'You need the clients:security permission');
    expect(menu.getByRole('menuitem', { name: 'Open' })).toBeEnabled();
  });

  it('opens the record from the menu', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts('/accounts?q=whitmore');
    await user.click(
      await (await openMenu(user, 'Daniel Whitmore')).findByRole('menuitem', { name: 'Open' }),
    );
    await waitFor(() => expect(app.location()).toBe('/accounts/101'));
  });

  it.each([
    ['Daniel Whitmore', 'Adjust wallet…', 'Adjust the wallet of Daniel Whitmore'],
    ['Daniel Whitmore', 'Change rank…', 'Change the rank of Daniel Whitmore'],
    ['Daniel Whitmore', 'Suspend…', 'Suspend Daniel Whitmore?'],
    ['Daniel Whitmore', 'Sign out everywhere', 'Sign Daniel Whitmore out everywhere?'],
    ['Hannah Weber', 'Reactivate…', 'Reactivate Hannah Weber?'],
    ['Sofia Alvarez', 'Make an account…', 'Make an account for Sofia Alvarez'],
  ])('opens the dialog of %s → %s with its fixed title, and closes it', async (name, item, title) => {
    const user = userEvent.setup();
    await renderAccounts(`/accounts?q=${name.split(' ')[1]!.toLowerCase()}`);
    await user.click(await (await openMenu(user, name)).findByRole('menuitem', { name: item }));
    expect(await screen.findByRole('dialog', { name: title })).toBeInTheDocument();
    await closeDialog(user);
    // The menu is closed and the dialog is gone: the list is where it was.
    expect(await accountRow(name)).toBeTruthy();
  });

  it('sends a link to set a password at once, with no dialog, and says where it went', async () => {
    const user = userEvent.setup();
    const seen = spy('post', '/admin/clients/101/password', () => HttpResponse.json({ link: 'reset' }));
    await renderAccounts('/accounts?q=whitmore');
    await user.click(
      await (
        await openMenu(user, 'Daniel Whitmore')
      ).findByRole('menuitem', { name: 'Send a password link' }),
    );
    expect(
      await screen.findByText('A link to set a password went to daniel.whitmore@mail.example'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.body).toEqual({ mode: 'reset_link', revokeSessions: false });
  });
});

describe('With selected', () => {
  const tick = async (user: User, ...ids: number[]) => {
    await accountsTable();
    for (const id of ids) await user.click(await screen.findByRole('checkbox', { name: `Select row ${id}` }));
  };
  const strip = () => within(screen.getByRole('group', { name: /With selected/ }));

  it('offers three buttons only: Suspend, Reactivate and Sign out everywhere, none of which moves money', async () => {
    await renderAccounts();
    await accountsTable();
    expect(
      within(screen.getByRole('group', { name: /With selected/ }))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Suspend…', 'Reactivate…', 'Sign out everywhere']);
  });

  it('leaves the buttons off while nothing is ticked, and counts the ticked rows', async () => {
    const user = userEvent.setup();
    await renderAccounts();
    await accountsTable();
    expect(screen.getByRole('group', { name: /With selected/ })).toBeDisabled();
    await tick(user, 101, 102);
    expect(screen.getByText('With selected (2):')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /With selected/ })).toBeEnabled();
  });

  it('ticks every row of the page with Check All, and clears them with Uncheck All', async () => {
    const user = userEvent.setup();
    await renderAccounts();
    await accountsTable();
    await user.click(screen.getByRole('button', { name: 'Check All' }));
    expect(screen.getByText('With selected (50):')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Uncheck All' }));
    expect(screen.getByText('With selected:')).toBeInTheDocument();
  });

  it('opens the many-account dialog of Reactivate with only the suspended accounts of those ticked', async () => {
    const user = userEvent.setup();
    await renderAccounts();
    await tick(user, 101, 118, 19);
    await user.click(strip().getByRole('button', { name: 'Reactivate…' }));
    expect(await screen.findByRole('dialog', { name: 'Reactivate 2 accounts?' })).toBeInTheDocument();
  });

  it('names the account when only one is a target', async () => {
    const user = userEvent.setup();
    await renderAccounts();
    await tick(user, 118);
    await user.click(strip().getByRole('button', { name: 'Reactivate…' }));
    expect(await screen.findByRole('dialog', { name: 'Reactivate Hannah Weber?' })).toBeInTheDocument();
  });

  it('opens Suspend for the active accounts ticked, and Sign out for those with a session', async () => {
    const user = userEvent.setup();
    await renderAccounts();
    await tick(user, 101, 118, 102);
    await user.click(strip().getByRole('button', { name: 'Suspend…' }));
    // Daniel and Sofia are active; Hannah is suspended already.
    expect(await screen.findByRole('dialog', { name: 'Suspend 2 accounts?' })).toBeInTheDocument();
    await closeDialog(user);
    // The ticks of a bulk action go with its dialog.
    await tick(user, 101);
    await user.click(strip().getByRole('button', { name: 'Sign out everywhere' }));
    expect(
      await screen.findByRole('dialog', { name: 'Sign Daniel Whitmore out everywhere?' }),
    ).toBeInTheDocument();
  });

  it('disables a button with the reason when none of the ticked accounts is a target', async () => {
    const user = userEvent.setup();
    await renderAccounts();
    await tick(user, 118);
    expect(strip().getByRole('button', { name: 'Suspend…' })).toHaveAttribute(
      'title',
      'Every ticked account is suspended already',
    );
    expect(strip().getByRole('button', { name: 'Suspend…' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Uncheck All' }));
    await tick(user, 101);
    expect(strip().getByRole('button', { name: 'Reactivate…' })).toHaveAttribute(
      'title',
      'None of the ticked accounts is suspended',
    );
    await user.click(screen.getByRole('button', { name: 'Uncheck All' }));
    await tick(user, 102);
    expect(strip().getByRole('button', { name: 'Sign out everywhere' })).toHaveAttribute(
      'title',
      'None of the ticked accounts has a session',
    );
  });

  it('names the permission a button needs when the role lacks it', async () => {
    const user = userEvent.setup();
    await renderAccounts('/accounts', { role: 'reader' });
    await tick(user, 101);
    expect(strip().getByRole('button', { name: 'Suspend…' })).toHaveAttribute(
      'title',
      'You need the clients:update and clients:security permission',
    );
    expect(strip().getByRole('button', { name: 'Sign out everywhere' })).toHaveAttribute(
      'title',
      'You need the clients:security permission',
    );
  });

  it('forgets the ticks when the page, the size, the sort or a filter changes', async () => {
    const user = userEvent.setup();
    await renderAccounts();
    await tick(user, 101);
    expect(screen.getByText('With selected (1):')).toBeInTheDocument();
    await user.click(within(await accountsTable()).getByRole('button', { name: 'Rank' }));
    await waitFor(() => expect(screen.getByText('With selected:')).toBeInTheDocument());
    await tick(user, 101);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Country' }), 'GB');
    await waitFor(() => expect(screen.getByText('With selected:')).toBeInTheDocument());
    await waitFor(async () => expect(await accountNames()).toHaveLength(6));
  });

  it('forgets the ticks of a bulk action once its dialog has closed', async () => {
    const user = userEvent.setup();
    await renderAccounts();
    await tick(user, 118);
    await user.click(strip().getByRole('button', { name: 'Reactivate…' }));
    await screen.findByRole('dialog');
    await closeDialog(user);
    expect(screen.getByText('With selected:')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select row 118' })).not.toBeChecked();
  });

  it('keeps the ticks when a single row action is opened and closed', async () => {
    const user = userEvent.setup();
    await renderAccounts();
    await tick(user, 118);
    await user.click(
      await (await openMenu(user, 'Daniel Whitmore')).findByRole('menuitem', { name: 'Suspend…' }),
    );
    await screen.findByRole('dialog');
    await closeDialog(user);
    expect(screen.getByRole('checkbox', { name: 'Select row 118' })).toBeChecked();
  });
});
