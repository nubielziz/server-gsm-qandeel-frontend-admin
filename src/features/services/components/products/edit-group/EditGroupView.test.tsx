// Tests for the edit view of a group, run through the whole app against the dev mock API: the form filled with the group, only what changed is
// sent, "Nothing changed", the server's messages under their fields, the strip corrected to the group's kind, the states of an address that
// names no group or one that does not exist, and a role that may only read.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getCategory } from '../../../api';
import { groupHandlers } from '../../../mocks/testGroups';
import { currentLink, kindStrip, openProducts, viewLinks } from '../../../test/productsPage';
import { recordRequests } from '../../../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
// The accounts feature serves the rank list; these tests bring their own copy of it.
beforeEach(() => mockServer.use(...groupHandlers));
afterEach(() => vi.restoreAllMocks());

const XIAOMI = 5; // an IMEI group with no ranks named, three services
const EDIT = `/products?view=edit-group&type=imei&id=${XIAOMI}`;
const nameBox = () => screen.findByRole('textbox', { name: 'Group Name' }, { timeout: 10_000 });

describe('the form', () => {
  it('is filled with the group, and the Group link is the current one', async () => {
    await openProducts(EDIT);
    expect(await screen.findByRole('heading', { level: 2, name: 'Edit Service Group' })).toBeInTheDocument();
    expect(await nameBox()).toHaveValue('Xiaomi');
    expect(screen.getByRole('switch', { name: 'Active' })).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByRole('checkbox', { name: 'All ranks' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(currentLink(await viewLinks())).toBe('Group');
  });

  it('saves the ranks that are ticked', async () => {
    const user = userEvent.setup();
    await openProducts(EDIT);
    await user.click(await screen.findByRole('checkbox', { name: 'VIP' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Xiaomi updated')).toBeInTheDocument();
    // A second visit reads the saved ranks.
    expect((await getCategory(XIAOMI)).allowedGroupIds).toEqual([3]);
  });
});

describe('Save', () => {
  it('sends only what changed, and starts from the saved values afterwards', async () => {
    const user = userEvent.setup();
    await openProducts(EDIT);
    await user.click(await screen.findByRole('checkbox', { name: 'VIP' }));
    await user.click(screen.getByRole('switch', { name: 'Active' }));
    const requests = recordRequests();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Xiaomi updated')).toBeInTheDocument();
    expect(requests.sent().find((request) => request.method === 'PATCH')?.body).toEqual({
      isActive: false,
      allowedGroupIds: [3],
    });
    expect(await getCategory(XIAOMI)).toMatchObject({
      name: 'Xiaomi',
      isActive: false,
      allowedGroupIds: [3],
    });
    // The form keeps what was saved, so saving again changes nothing.
    expect(screen.getByRole('switch', { name: 'Active' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('checkbox', { name: 'VIP' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(requests.sent().filter((request) => request.method === 'PATCH')).toHaveLength(1);
  });

  it('renames the group, and trims the name', async () => {
    const user = userEvent.setup();
    await openProducts(EDIT);
    const box = await nameBox();
    await waitFor(() => expect(box).toHaveValue('Xiaomi'));
    await user.clear(box);
    await user.type(box, '  Xiaomi Pro ');
    const requests = recordRequests();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Xiaomi Pro updated')).toBeInTheDocument();
    expect(requests.sent().find((request) => request.method === 'PATCH')?.body).toEqual({
      name: 'Xiaomi Pro',
    });
  });

  it('says so, and sends nothing, when nothing changed', async () => {
    const user = userEvent.setup();
    await openProducts(EDIT);
    await nameBox();
    const requests = recordRequests();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(requests.sent().some((request) => request.method === 'PATCH')).toBe(false);
  });

  it('asks for a name before it calls the server', async () => {
    const user = userEvent.setup();
    await openProducts(EDIT);
    const box = await nameBox();
    await waitFor(() => expect(box).toHaveValue('Xiaomi'));
    await user.clear(box);
    const requests = recordRequests();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(requests.sent().some((request) => request.method === 'PATCH')).toBe(false);
  });

  it('puts the server’s messages under their fields', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/service-categories/:id', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'name', message: 'An IMEI category with this name already exists.' },
          { field: 'allowedGroupIds', message: 'Group 9 is closed.' },
        ]),
      ),
    );
    await openProducts(EDIT);
    const box = await nameBox();
    await waitFor(() => expect(box).toHaveValue('Xiaomi'));
    await user.clear(box);
    await user.type(box, 'Apple');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('An IMEI category with this name already exists.')).toBeInTheDocument();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Visible to' })).getByText('Group 9 is closed.'),
    ).toBeInTheDocument();
    expect(box).toHaveValue('Apple');
  });
});

describe('a name that is taken', () => {
  it('is said in the words of the console, with the kind of the group, and the other messages stay as they are', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/service-categories/:id', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'name', code: 'duplicate', message: 'An IMEI category with this name already exists.' },
          { field: 'allowedGroupIds', code: 'invalid', message: 'Group 9 is closed.' },
        ]),
      ),
    );
    await openProducts(EDIT);
    const box = await nameBox();
    await waitFor(() => expect(box).toHaveValue('Xiaomi'));
    await user.clear(box);
    await user.type(box, 'Apple');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('A group with this name already exists in IMEI Service.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('An IMEI category with this name already exists.')).not.toBeInTheDocument();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Visible to' })).getByText('Group 9 is closed.'),
    ).toBeInTheDocument();
  });
});

describe('the address', () => {
  it('corrects the strip to the kind of the group', async () => {
    const app = await openProducts(`/products?view=edit-group&type=server&id=${XIAOMI}`);
    await waitFor(() => expect(app.location()).toBe(EDIT));
    await waitFor(async () => expect(currentLink(await kindStrip())).toBe('IMEI Service'));
    expect(await nameBox()).toHaveValue('Xiaomi');
  });

  it('says no group is chosen when the address names none, with a way back', async () => {
    await openProducts('/products?view=edit-group&type=server');
    expect(await screen.findByRole('heading', { level: 3, name: 'No group chosen' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Group' })).toHaveAttribute(
      'href',
      '/products?view=groups&type=server',
    );
  });

  it('shows the words of the server for a group that does not exist', async () => {
    await openProducts('/products?view=edit-group&id=999999');
    expect(
      await screen.findByRole(
        'heading',
        { level: 3, name: 'Could not load this group' },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('No category with id 999999.')).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('lets a reader see the group but not change it, and says what is missing', async () => {
    await openProducts(EDIT, { permissions: ['catalog:read'] });
    const box = await nameBox();
    await waitFor(() => expect(box).toHaveValue('Xiaomi'));
    expect(box).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Active' })).toBeDisabled();
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('title', 'You need the catalog:update permission');
    expect(screen.getByText('You need the catalog:update permission')).toBeInTheDocument();
    expect(
      screen.getByText(
        'You need the groups:read permission to choose ranks. The group keeps the ranks it has now.',
      ),
    ).toBeInTheDocument();
  });
});
