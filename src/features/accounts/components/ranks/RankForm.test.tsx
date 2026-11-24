// Tests for +Add Rank and Edit rank, run through the whole app against the dev mock API: the label-left form and its one button, the checks before
// anything is sent, the body of a create and the changed fields only of an update, the server's messages under their fields and beside the
// button, the retail rank's form, an unknown rank, the roles and the question before unsaved typing is lost. Ports the group dialog cases of the
// old merchants page.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { currentLink, renderAccounts, viewLinks } from '../../pages/test-utils';
import { installAccountMocks } from '../../test/installAccountMocks';
import { sentRequests } from './ranksTestKit';

setupMockApi();
installAccountMocks();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

const ADD = '/accounts?view=add-rank';
const edit = (id: number) => `/accounts?view=edit-rank&id=${id}`;
const WHOLESALE = 2;
const RETAIL = 4;

const nameBox = () => screen.findByRole('textbox', { name: 'Rank name' }, { timeout: 10_000 });
const discountBox = () => screen.getByRole('textbox', { name: 'Discount' });
const depositBox = () => screen.getByRole('textbox', { name: 'Deposit limit' });
const creditSwitch = () => screen.getByRole('switch', { name: 'Credit' });
const startSwitch = () => screen.getByRole('switch', { name: 'New merchants start here' });

// Replaces what a box holds.
async function typeInto(user: ReturnType<typeof userEvent.setup>, box: HTMLElement, text: string) {
  await user.clear(box);
  if (text) await user.type(box, text);
}

describe('+Add Rank', () => {
  it('shows the heading, the rows and one Add button, with the +Add Rank link current', async () => {
    await renderAccounts(ADD);
    expect(await screen.findByRole('heading', { level: 2, name: 'Add Rank' })).toBeInTheDocument();
    const name = await nameBox();
    expect(name).toBeRequired();
    expect(name).toHaveValue('');
    expect(name).toHaveAttribute('maxlength', '60');
    expect(within(screen.getByRole('group', { name: 'Kind' })).getByText('Merchant')).toBeInTheDocument();
    expect(discountBox()).toHaveValue('0');
    expect(screen.getByText('Off base prices.')).toBeInTheDocument();
    expect(depositBox()).toHaveValue('0.00');
    expect(screen.getByText('Most an account of this rank may add at once.')).toBeInTheDocument();
    expect(creditSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Accounts of this rank can have a credit limit.')).toBeInTheDocument();
    expect(startSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Preselected when the Owner adds a merchant.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
    expect(screen.queryByRole('textbox', { name: /Upgrade threshold/ })).not.toBeInTheDocument();
    expect(currentLink(await viewLinks())).toBe('+Add Rank');
  });

  it('checks the name, the discount and the deposit limit before it calls the server', async () => {
    const user = userEvent.setup();
    await renderAccounts(ADD);
    await nameBox();
    await typeInto(user, discountBox(), '150');
    await typeInto(user, depositBox(), 'twenty');
    const sent = sentRequests('POST');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Enter a rank name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a percent from 0 to 100, with up to two decimals.')).toBeInTheDocument();
    expect(screen.getByText('Enter an amount like 20000.00.')).toBeInTheDocument();
    expect(await nameBox()).toHaveAttribute('aria-invalid', 'true');
    expect(discountBox()).toHaveAttribute('aria-invalid', 'true');
    expect(sent().filter((request) => request.url.includes('/client-groups'))).toEqual([]);
  });

  it('makes a merchant rank, sends the trimmed name and the figures in the API’s text, and opens the Ranks view', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts(ADD);
    await user.type(await nameBox(), '  Reseller ');
    await typeInto(user, discountBox(), '6');
    await typeInto(user, depositBox(), '50,000');
    await user.click(creditSwitch());
    expect(creditSwitch()).toHaveAttribute('aria-checked', 'true');
    const sent = sentRequests('POST');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Reseller rank created')).toBeInTheDocument();
    await waitFor(() => expect(app.location()).toBe('/accounts?view=ranks'));
    expect(sent().find((request) => request.url.endsWith('/admin/client-groups'))?.body).toEqual({
      name: 'Reseller',
      discountPercent: '6',
      depositLimit: '50000.0000',
      overdraftAllowed: true,
      isDefault: false,
    });
    const row = (await screen.findByText('Reseller')).closest('tr');
    expect(row && within(row).getByText('Allowed')).toBeInTheDocument();
    expect(row && within(row).getByText('$50,000')).toBeInTheDocument();
    expect(row && within(row).getByText('6%')).toBeInTheDocument();
  });

  it('takes the mark of the default off the old default rank when the new one starts new merchants', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts(ADD);
    await user.type(await nameBox(), 'Reseller');
    await user.click(startSwitch());
    const sent = sentRequests('POST');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?view=ranks'));
    expect(sent().find((request) => request.url.endsWith('/admin/client-groups'))?.body).toMatchObject({
      isDefault: true,
    });
    const table = within(await screen.findByRole('table', { name: 'Ranks' }));
    const marked = await table.findAllByText('new merchants start here');
    expect(marked).toHaveLength(1);
    expect(marked[0].closest('tr')).toHaveTextContent('Reseller');
  });

  it('shows the server’s message under the name when it is taken', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts(ADD);
    await user.type(await nameBox(), 'vip');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('A rank with this name already exists.')).toBeInTheDocument();
    expect(await nameBox()).toHaveAttribute('aria-invalid', 'true');
    expect(app.location()).toBe(ADD);
  });

  it('shows any other refusal beside the button and keeps what was typed', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/client-groups', () =>
        problem(409, 'LOCKED', 'Ranks are locked', 'Ranks cannot change during the audit.'),
      ),
    );
    await renderAccounts(ADD);
    await user.type(await nameBox(), 'Reseller');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Ranks cannot change during the audit.')).toBeInTheDocument();
    expect(await nameBox()).toHaveValue('Reseller');
  });

  it('asks before typing is lost, and goes on when the staff member says so', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts(ADD);
    await user.type(await nameBox(), 'Reseller');
    await user.click((await viewLinks()).getByRole('link', { name: 'Ranks' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' }));
    await user.click(dialog.getByRole('button', { name: 'Keep editing' }));
    expect(app.location()).toBe(ADD);
    expect(await nameBox()).toHaveValue('Reseller');
    await user.click((await viewLinks()).getByRole('link', { name: 'Ranks' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' })).getByRole(
        'button',
        {
          name: 'Discard changes',
        },
      ),
    );
    await waitFor(() => expect(app.location()).toBe('/accounts?view=ranks'));
  });

  it('asks nothing when nothing was typed', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts(ADD);
    await nameBox();
    await user.click((await viewLinks()).getByRole('link', { name: 'Ranks' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?view=ranks'));
  });
});

describe('Edit rank', () => {
  it('shows the heading and the rank’s own values, with Save off while nothing changed', async () => {
    await renderAccounts(edit(WHOLESALE));
    expect(await screen.findByRole('heading', { level: 2, name: 'Edit Wholesale' })).toBeInTheDocument();
    expect(await nameBox()).toHaveValue('Wholesale');
    expect(within(screen.getByRole('group', { name: 'Kind' })).getByText('Merchant')).toBeInTheDocument();
    expect(discountBox()).toHaveValue('4');
    expect(depositBox()).toHaveValue('20000.00');
    expect(creditSwitch()).toHaveAttribute('aria-checked', 'true');
    expect(startSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(currentLink(await viewLinks())).toBe('Ranks');
  });

  it('says how many accounts are in the rank, with a link to them', async () => {
    await renderAccounts(edit(WHOLESALE));
    expect(
      await screen.findByText(/\d+ accounts are in this rank\. A change applies to their next order\./),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show them' })).toHaveAttribute(
      'href',
      '/accounts?chip=merchants&rank=2',
    );
  });

  it('sends only what changed, says so, and compares the next save with what was just saved', async () => {
    const user = userEvent.setup();
    await renderAccounts(edit(WHOLESALE));
    await typeInto(user, await nameBox(), 'Wholesale');
    await typeInto(user, discountBox(), '5');
    const sent = sentRequests('PATCH');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Wholesale rank updated')).toBeInTheDocument();
    expect(screen.getByText('The change applies to the next order of its accounts.')).toBeInTheDocument();
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(sent().map((request) => request.body)).toEqual([{ discountPercent: '5' }]);
    expect(discountBox()).toHaveValue('5');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled());

    await typeInto(user, depositBox(), '25000');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(sent()).toHaveLength(2));
    expect(sent()[1].body).toEqual({ depositLimit: '25000.0000' });
  });

  it('shows the new figures in the Ranks view after a save', async () => {
    const user = userEvent.setup();
    await renderAccounts(edit(3));
    await typeInto(user, await nameBox(), 'Platinum');
    await typeInto(user, discountBox(), '9.5');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Platinum rank updated')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Edit Platinum' })).toBeInTheDocument();
    await user.click((await viewLinks()).getByRole('link', { name: 'Ranks' }));
    const row = (
      await within(await screen.findByRole('table', { name: 'Ranks' })).findByText('Platinum')
    ).closest('tr');
    expect(row && within(row).getByText('9.5%')).toBeInTheDocument();
  });

  it('can make the rank the one new merchants start in', async () => {
    const user = userEvent.setup();
    await renderAccounts(edit(WHOLESALE));
    await nameBox();
    await user.click(startSwitch());
    const sent = sentRequests('PATCH');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Wholesale rank updated')).toBeInTheDocument();
    expect(sent().map((request) => request.body)).toEqual([{ isDefault: true }]);
  });

  it('says "Nothing changed" and puts the form back when a figure was only written another way', async () => {
    const user = userEvent.setup();
    await renderAccounts(edit(WHOLESALE));
    await nameBox();
    await typeInto(user, discountBox(), '4.0');
    const sent = sentRequests('PATCH');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(sent()).toEqual([]);
    await waitFor(() => expect(discountBox()).toHaveValue('4'));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows the server’s message under the name when it is taken', async () => {
    const user = userEvent.setup();
    await renderAccounts(edit(WHOLESALE));
    await typeInto(user, await nameBox(), 'VIP');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('A rank with this name already exists.')).toBeInTheDocument();
    expect(await nameBox()).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows any other refusal beside the button', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/client-groups/:id', ({ params }) =>
        problem(409, 'LOCKED', 'Stop', `seen ${String(params.id)}`),
      ),
    );
    await renderAccounts(edit(WHOLESALE));
    await nameBox();
    await typeInto(user, discountBox(), '5');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('seen 2')).toBeInTheDocument();
    expect(discountBox()).toHaveValue('5');
  });

  it('asks before changes are lost', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts(edit(WHOLESALE));
    await typeInto(user, await nameBox(), 'Trade');
    await user.click((await viewLinks()).getByRole('link', { name: 'All' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' })).getByRole(
        'button',
        {
          name: 'Keep editing',
        },
      ),
    );
    expect(app.location()).toBe(edit(WHOLESALE));
    expect(await nameBox()).toHaveValue('Trade');
  });
});

describe('the retail rank', () => {
  it('has no discount and no default mark, and never allows credit', async () => {
    const user = userEvent.setup();
    await renderAccounts(edit(RETAIL));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Edit Storefront retail' }),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Kind' })).getByText('Retail')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Discount' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'New merchants start here' })).not.toBeInTheDocument();
    expect(creditSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(creditSwitch()).toBeDisabled();
    expect(creditSwitch()).toHaveAttribute('title', 'The retail rank never allows credit');
    expect(screen.getByText('The retail rank never allows credit.')).toBeInTheDocument();

    await typeInto(user, depositBox(), '1500');
    const sent = sentRequests('PATCH');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Storefront retail rank updated')).toBeInTheDocument();
    expect(sent().map((request) => request.body)).toEqual([{ depositLimit: '1500.0000' }]);
  });
});

describe('a rank that is not there', () => {
  it('says so, with a way back, for a number that is no rank', async () => {
    await renderAccounts(edit(999));
    expect(
      await screen.findByRole('heading', { level: 3, name: 'This rank does not exist' }),
    ).toBeInTheDocument();
    expect(screen.getByText('There is no rank #999. It may have been deleted.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Ranks' })).toHaveAttribute(
      'href',
      '/accounts?view=ranks',
    );
  });

  it('says so for an address that names no rank, or names it badly', async () => {
    for (const address of ['/accounts?view=edit-rank', '/accounts?view=edit-rank&id=abc']) {
      const view = await renderAccounts(address);
      expect(
        await screen.findByRole('heading', { level: 3, name: 'This rank does not exist' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to Ranks' })).toBeInTheDocument();
      view.unmount();
    }
  });

  it('says it could not load the rank, with a Retry', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get(
        '*/admin/client-groups/:id',
        () => problem(403, 'FORBIDDEN', 'No access', 'Ranks are closed.'),
        {
          once: true,
        },
      ),
    );
    await renderAccounts(edit(WHOLESALE));
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Could not load this rank' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Edit Wholesale' })).toBeInTheDocument();
  });
});

describe('the roles', () => {
  it('locks the form of a role that may read ranks but not change them, and says why beside the button', async () => {
    await renderAccounts(edit(WHOLESALE), { permissions: ['groups:read'] });
    expect(await nameBox()).toBeDisabled();
    expect(discountBox()).toBeDisabled();
    expect(creditSwitch()).toBeDisabled();
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    expect(screen.getAllByText('You need the groups:update permission').length).toBeGreaterThan(0);
  });

  it('lets a role that may read and create ranks open +Add Rank', async () => {
    await renderAccounts(ADD, { permissions: ['groups:read', 'groups:create'] });
    expect(await nameBox()).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
    expect(currentLink(await viewLinks())).toBe('+Add Rank');
  });

  it('sends a role that may not create ranks from +Add Rank to the first view it may use', async () => {
    const app = await renderAccounts(ADD, { permissions: ['groups:read'] });
    await waitFor(() => expect(app.location()).toBe('/accounts?view=ranks'));
  });
});
