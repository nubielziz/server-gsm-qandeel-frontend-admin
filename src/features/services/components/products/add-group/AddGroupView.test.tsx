// Tests for the +Add Group view, run through the whole app against the dev mock API: the label-left form, how "All ranks" and the rank boxes
// work together, a group made in the kind on the strip (last in the list, no position sent), the server's messages under their fields, and a
// role that cannot read the ranks.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { listCategories } from '../../../api';
import { groupHandlers } from '../../../mocks/testGroups';
import { currentLink, openProducts, viewLinks } from '../../../test/productsPage';
import { recordRequests } from '../../../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
// The accounts feature serves the rank list; these tests bring their own copy of it.
beforeEach(() => mockServer.use(...groupHandlers));
afterEach(() => vi.restoreAllMocks());

const ADD = '/products?view=add-group';
const nameBox = () => screen.findByRole('textbox', { name: 'Group Name' }, { timeout: 10_000 });
const allRanks = () => screen.getByRole('checkbox', { name: 'All ranks' });

describe('the form', () => {
  it('shows the heading, the three rows and one Add button, with the Add Group link current', async () => {
    await openProducts(ADD);
    expect(await screen.findByRole('heading', { level: 2, name: 'Add Service Group' })).toBeInTheDocument();
    expect(await nameBox()).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Group Name' })).toHaveValue('');
    expect(screen.getByRole('switch', { name: 'Active' })).toHaveAttribute('aria-checked', 'true');
    const visible = within(await screen.findByRole('group', { name: 'Visible to' }));
    expect(allRanks()).toBeChecked();
    for (const rank of ['Standard', 'Wholesale', 'VIP']) {
      expect(await visible.findByRole('checkbox', { name: rank })).not.toBeChecked();
    }
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
    // The link draws a "+" before its label.
    expect(currentLink(await viewLinks())).toBe('+Add Group');
  });

  it('puts the heading flush under the link row, at the height of the other views', async () => {
    await openProducts(ADD);
    const heading = await screen.findByRole('heading', { level: 2, name: 'Add Service Group' });
    expect(heading).toHaveAttribute('class', 'section-heading');
  });

  it('keeps "All ranks" and the rank boxes in step', async () => {
    const user = userEvent.setup();
    await openProducts(ADD);
    // With no rank ticked every rank sees the group, and that box cannot be unticked.
    await user.click(await screen.findByRole('checkbox', { name: 'VIP' }));
    expect(allRanks()).not.toBeChecked();
    expect(allRanks()).toBeEnabled();
    await user.click(screen.getByRole('checkbox', { name: 'Wholesale' }));
    expect(screen.getByRole('checkbox', { name: 'VIP' })).toBeChecked();
    await user.click(allRanks());
    expect(allRanks()).toBeChecked();
    expect(allRanks()).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'VIP' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Wholesale' })).not.toBeChecked();
    // Unticking the last rank goes back to every rank.
    await user.click(screen.getByRole('checkbox', { name: 'VIP' }));
    await user.click(screen.getByRole('checkbox', { name: 'VIP' }));
    expect(allRanks()).toBeChecked();
  });
});

describe('Add', () => {
  it('makes a group of the kind on the strip, visible to the ranks ticked, and opens the list', async () => {
    const user = userEvent.setup();
    const app = await openProducts(`${ADD}&type=server`);
    await user.type(await nameBox(), '  Bulk credits ');
    await user.click(await screen.findByRole('checkbox', { name: 'Wholesale' }));
    await user.click(screen.getByRole('checkbox', { name: 'VIP' }));
    const requests = recordRequests();
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Bulk credits created')).toBeInTheDocument();
    await waitFor(() => expect(app.location()).toBe('/products?view=groups&type=server'));
    // The name is trimmed, and no position is sent: the server puts the new group last.
    expect(requests.sent().find((request) => request.method === 'POST')?.body).toEqual({
      name: 'Bulk credits',
      type: 'server',
      allowedGroupIds: [2, 3],
      isActive: true,
    });
    const all = (await listCategories()).data;
    const created = all.find((category) => category.name === 'Bulk credits');
    expect(created).toMatchObject({
      type: 'server',
      allowedGroupIds: [2, 3],
      isActive: true,
      serviceCount: 0,
    });
    expect(created?.sort).toBeGreaterThan(Math.max(...all.filter((c) => c !== created).map((c) => c.sort)));
    // The list shows the new group last in its kind, with the ranks named.
    const table = within(await screen.findByRole('table', { name: 'Service groups' }));
    const row = within((await table.findByText('Bulk credits')).closest('tr') as HTMLElement);
    expect(row.getByText('Wholesale, VIP')).toBeInTheDocument();
    const names = table
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[1].textContent);
    expect(names.at(-1)).toBe('Bulk credits');
  });

  it('makes an inactive group when Active is switched to No', async () => {
    const user = userEvent.setup();
    await openProducts(ADD);
    await user.type(await nameBox(), 'Dormant');
    await user.click(screen.getByRole('switch', { name: 'Active' }));
    expect(screen.getByRole('switch', { name: 'Active' })).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Dormant created')).toBeInTheDocument();
    const created = (await listCategories()).data.find((category) => category.name === 'Dormant');
    expect(created).toMatchObject({ type: 'imei', isActive: false, allowedGroupIds: [] });
  });

  it('asks for a name before it calls the server', async () => {
    const user = userEvent.setup();
    await openProducts(ADD);
    await nameBox();
    const requests = recordRequests();
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Group Name' })).toHaveAttribute('aria-invalid', 'true');
    expect(requests.sent().some((request) => request.method === 'POST')).toBe(false);
  });

  it('puts the server’s messages under their fields and the rest beside the button, and stays on the form', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/service-categories', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'name', message: 'An IMEI category with this name already exists.' },
          { field: 'allowedGroupIds', message: 'Group 9 is closed.' },
          { field: 'sort', message: 'Positions are fixed here.' },
        ]),
      ),
    );
    const app = await openProducts(ADD);
    await user.type(await nameBox(), 'Apple');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('An IMEI category with this name already exists.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Group Name' })).toHaveAttribute('aria-invalid', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Visible to' })).getByText('Group 9 is closed.'),
    ).toBeInTheDocument();
    expect(screen.getByText('sort: Positions are fixed here.')).toBeInTheDocument();
    expect(app.location()).toBe(ADD);
    expect(screen.getByRole('textbox', { name: 'Group Name' })).toHaveValue('Apple');
  });

  it('says when the ranks could not be loaded, with a Retry, and does not offer them until they come', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/client-groups', () => problem(403, 'FORBIDDEN', 'No access', 'Ranks are closed.')),
    );
    await openProducts(ADD);
    expect(await screen.findByText(/Could not load merchant ranks\./)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'All ranks' })).not.toBeInTheDocument();
    expect(screen.getByText('A new group is visible to every rank.')).toBeInTheDocument();
    mockServer.use(...groupHandlers);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('checkbox', { name: 'Wholesale' })).toBeInTheDocument();
    expect(screen.queryByText(/Could not load merchant ranks/)).not.toBeInTheDocument();
  });
});

describe('opened from the "Add New Group" link of +Add Service', () => {
  const OPENED = '/products?view=add-group&type=imei&return=add';
  const serviceName = () => screen.findByRole('textbox', { name: 'Service Name' }, { timeout: 10_000 });

  /** Opens +Add Service, types three boxes and follows "Add New Group". */
  async function typeThenAddGroup() {
    const user = userEvent.setup();
    const app = await openProducts('/products?view=add');
    await user.type(await serviceName(), 'Pixel Later');
    await user.type(screen.getByRole('textbox', { name: 'Code' }), 'IMEI-PX-9');
    await user.type(screen.getByRole('textbox', { name: 'Credit' }), '4.25');
    await user.click(screen.getByRole('link', { name: 'Add New Group' }));
    await waitFor(() => expect(app.location()).toBe(OPENED));
    return { app, user };
  }

  it('comes back to +Add Service with what was typed and the new group chosen, and clears the draft', async () => {
    const { app, user } = await typeThenAddGroup();
    await user.type(await nameBox(), 'Brand new');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(app.location()).toBe('/products?view=add&type=imei'));

    expect(await serviceName()).toHaveValue('Pixel Later');
    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveValue('IMEI-PX-9');
    expect(screen.getByRole('textbox', { name: 'Credit' })).toHaveValue('4.25');
    const group = screen.getByRole('combobox', { name: 'Service Listed In Group' });
    await within(group).findByRole('option', { name: 'Brand new' });
    expect(group).toHaveDisplayValue('Brand new');
    expect(sessionStorage.getItem('gsm-products-add-draft:imei')).toBeNull();
  });

  it('keeps what was typed when the person goes back without adding a group, and only once', async () => {
    const { user } = await typeThenAddGroup();
    await screen.findByRole('textbox', { name: 'Group Name' });
    await user.click((await viewLinks()).getByRole('link', { name: 'Add Service' }));
    expect(await serviceName()).toHaveValue('Pixel Later');
    expect(screen.getByRole('textbox', { name: 'Credit' })).toHaveValue('4.25');
    expect(screen.getByRole('combobox', { name: 'Service Listed In Group' })).toHaveDisplayValue(
      'Choose a group',
    );

    // The draft was used: a later visit starts blank.
    await user.click((await viewLinks()).getByRole('link', { name: 'Group' }));
    await screen.findByRole('table', { name: 'Service groups' });
    await user.click((await viewLinks()).getByRole('link', { name: 'Add Service' }));
    expect(await serviceName()).toHaveValue('');
  });

  it('chooses the new group in a blank form when nothing was typed before', async () => {
    const user = userEvent.setup();
    const app = await openProducts(OPENED);
    await user.type(await nameBox(), 'Fresh start');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(app.location()).toBe('/products?view=add&type=imei'));
    expect(await serviceName()).toHaveValue('');
    const group = screen.getByRole('combobox', { name: 'Service Listed In Group' });
    await within(group).findByRole('option', { name: 'Fresh start' });
    expect(group).toHaveDisplayValue('Fresh start');
  });

  it('does not come back when the view was opened from the Group list (no return key)', async () => {
    const user = userEvent.setup();
    const app = await openProducts('/products?view=add-group&type=imei');
    await user.type(await nameBox(), 'Plain list');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(app.location()).toBe('/products?view=groups&type=imei'));
  });

  it('stays on the form with the server’s message when the group is refused, and the draft is not touched', async () => {
    mockServer.use(
      http.post('*/admin/service-categories', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'name', message: 'An IMEI category with this name already exists.' },
        ]),
      ),
    );
    const user = userEvent.setup();
    const app = await openProducts(OPENED);
    await user.type(await nameBox(), 'Apple');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('An IMEI category with this name already exists.')).toBeInTheDocument();
    expect(app.location()).toBe(OPENED);
    expect(sessionStorage.getItem('gsm-products-add-draft:imei')).toBeNull();
  });
});

describe('permissions', () => {
  it('does not offer the ranks to a role that cannot read them, and makes the group visible to every rank', async () => {
    const user = userEvent.setup();
    await openProducts(ADD, { permissions: ['catalog:read', 'catalog:create'] });
    await user.type(await nameBox(), 'Plain');
    expect(
      screen.getByText(
        'You need the groups:read permission to choose ranks. A new group is visible to every rank.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'All ranks' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Plain created')).toBeInTheDocument();
    expect(
      (await listCategories()).data.find((category) => category.name === 'Plain')?.allowedGroupIds,
    ).toEqual([]);
  });

  it('has no Add Group link or view for a role that may not create groups', async () => {
    const app = await openProducts(ADD, { permissions: ['catalog:read'] });
    await waitFor(() => expect(app.location()).toBe('/products?view=all'));
    expect(screen.queryByRole('textbox', { name: 'Group Name' })).not.toBeInTheDocument();
  });
});
