// Tests for the Categories tab, run through the whole app against the dev mock API: the list with the groups that see each category,
// New category and Edit (only what changed is sent), and Delete with the server's refusal for a category that services still use.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getCategory, listCategories } from '../api';
import { groupHandlers } from '../mocks/testGroups';
import { dialogOf, openServices } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
// The merchants feature serves the group list; these tests bring their own copy of it.
beforeEach(() => mockServer.use(...groupHandlers));

const CATEGORIES = '/services?tab=categories';
/** The row of the categories table that holds some text. */
async function categoryRow(text: string) {
  const table = within(await screen.findByRole('table', { name: 'Service categories' }));
  return within((await table.findByText(text)).closest('tr') as HTMLElement);
}

describe('the list', () => {
  it('lists the categories with their type, services and who sees them', async () => {
    await openServices(CATEGORIES);
    const row = await categoryRow('Carrier unlock');
    expect(row.getByText('IMEI')).toBeInTheDocument();
    expect(row.getByText('All groups')).toBeInTheDocument();
    expect(row.getByText('6')).toBeInTheDocument();
    expect(row.getByText('Shown')).toBeInTheDocument();
    const table = within(screen.getByRole('table', { name: 'Service categories' }));
    expect(table.getAllByRole('row')).toHaveLength(10); // the header and nine categories
  });
});

describe('New category', () => {
  it('creates a category visible to some merchant groups only', async () => {
    const user = userEvent.setup();
    await openServices(CATEGORIES);
    await user.click(await screen.findByRole('button', { name: 'New category' }));
    const dialog = dialogOf('New category');
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Bulk credits');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Type' }), 'Server');
    await user.click(await dialog.findByRole('checkbox', { name: 'Wholesale' }));
    await user.click(dialog.getByRole('checkbox', { name: 'VIP' }));
    await user.click(dialog.getByRole('button', { name: 'Create category' }));
    expect(await screen.findByText('Bulk credits created')).toBeInTheDocument();
    const row = await categoryRow('Bulk credits');
    expect(row.getByText('Server')).toBeInTheDocument();
    expect(row.getByText('Wholesale, VIP')).toBeInTheDocument();
    const created = (await listCategories()).data.find((category) => category.name === 'Bulk credits');
    expect(created).toMatchObject({
      type: 'server',
      allowedGroupIds: [2, 3],
      isActive: true,
      serviceCount: 0,
    });
  });

  it('shows the server’s messages under the type and the shown switch, and the rest in the error slot', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/service-categories', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'type', message: 'Files cannot be sold here.' },
          { field: 'isActive', message: 'A new category must be shown.' },
          { field: 'allowedGroupIds', message: 'Group 9 is closed.' },
        ]),
      ),
    );
    await openServices(CATEGORIES);
    await user.click(await screen.findByRole('button', { name: 'New category' }));
    const dialog = dialogOf('New category');
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Odd');
    await user.click(dialog.getByRole('button', { name: 'Create category' }));
    expect(await dialog.findByText('Files cannot be sold here.')).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Type' })).toHaveAttribute('aria-invalid', 'true');
    expect(dialog.getByText('A new category must be shown.')).toBeInTheDocument();
    expect(dialog.getByRole('checkbox', { name: 'Shown to merchants' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    // The groups are ticks, not a form field, so a message about them is in the error slot.
    expect(dialog.getByRole('alert')).toHaveTextContent('allowedGroupIds: Group 9 is closed.');
  });

  it('says so, with a Retry, when the merchant groups could not be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/client-groups', () => problem(403, 'FORBIDDEN', 'No access', 'Groups are closed.')),
    );
    await openServices(CATEGORIES);
    await user.click(await screen.findByRole('button', { name: 'New category' }));
    const dialog = dialogOf('New category');
    expect(await dialog.findByText(/Could not load merchant groups\./)).toBeInTheDocument();
    expect(dialog.getByText('The category keeps the groups it has now.')).toBeInTheDocument();
    // The groups come back; Retry asks again.
    mockServer.use(...groupHandlers);
    await user.click(dialog.getByRole('button', { name: 'Retry' }));
    expect(await dialog.findByRole('checkbox', { name: 'Wholesale' })).toBeInTheDocument();
    expect(dialog.queryByText(/Could not load merchant groups/)).not.toBeInTheDocument();
  });

  it('asks for a name before it calls the server', async () => {
    const user = userEvent.setup();
    await openServices(CATEGORIES);
    await user.click(await screen.findByRole('button', { name: 'New category' }));
    await user.click(dialogOf('New category').getByRole('button', { name: 'Create category' }));
    expect(await dialogOf('New category').findByText('Enter a name.')).toBeInTheDocument();
  });
});

describe('Edit category', () => {
  it('changes the groups and hides the category, sending only what changed', async () => {
    const user = userEvent.setup();
    await openServices(CATEGORIES);
    const row = await categoryRow('Xiaomi');
    await user.click(row.getByRole('button', { name: 'Edit Xiaomi' }));
    const dialog = dialogOf('Edit Xiaomi');
    await user.click(await dialog.findByRole('checkbox', { name: 'VIP' }));
    await user.click(dialog.getByRole('checkbox', { name: 'Shown to merchants' }));
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Xiaomi updated')).toBeInTheDocument();
    expect(await getCategory(5)).toMatchObject({ name: 'Xiaomi', allowedGroupIds: [3], isActive: false });
    const changed = await categoryRow('Xiaomi');
    expect(await changed.findByText('Hidden')).toBeInTheDocument();
    expect(changed.getByText('VIP')).toBeInTheDocument();
  });

  it('says so when nothing changed', async () => {
    const user = userEvent.setup();
    await openServices(CATEGORIES);
    const row = await categoryRow('Xiaomi');
    await user.click(row.getByRole('button', { name: 'Edit Xiaomi' }));
    await user.click(dialogOf('Edit Xiaomi').getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });
});

describe('Delete category', () => {
  it('shows the server’s refusal for a category that services still use', async () => {
    const user = userEvent.setup();
    await openServices(CATEGORIES);
    const row = await categoryRow('Apple');
    await user.click(row.getByRole('button', { name: 'Delete Apple' }));
    const dialog = dialogOf('Delete Apple?');
    await user.click(dialog.getByRole('button', { name: 'Delete category' }));
    expect(
      await dialog.findByText('Apple still has 4 services. Move them to another category first.'),
    ).toBeInTheDocument();
    expect((await getCategory(1)).name).toBe('Apple');
  });

  it('deletes an empty category', async () => {
    const user = userEvent.setup();
    await openServices(CATEGORIES);
    await user.click(await screen.findByRole('button', { name: 'New category' }));
    await user.type(dialogOf('New category').getByRole('textbox', { name: 'Name' }), 'Spare');
    await user.click(dialogOf('New category').getByRole('button', { name: 'Create category' }));
    const row = await categoryRow('Spare');
    await user.click(row.getByRole('button', { name: 'Delete Spare' }));
    await user.click(dialogOf('Delete Spare?').getByRole('button', { name: 'Delete category' }));
    expect(await screen.findByText('Spare deleted')).toBeInTheDocument();
    expect((await listCategories()).data.some((category) => category.name === 'Spare')).toBe(false);
  });
});

describe('permissions', () => {
  it('lets a reader see the categories but not change them', async () => {
    await openServices(CATEGORIES, { permissions: ['catalog:read'] });
    const row = await categoryRow('Apple');
    expect(row.getByRole('button', { name: 'Edit Apple' })).toBeDisabled();
    expect(row.getByRole('button', { name: 'Delete Apple' })).toBeDisabled();
    const create = screen.getByRole('button', { name: 'New category' });
    expect(create).toBeDisabled();
    expect(create).toHaveAttribute('title', 'You need the catalog:create permission');
    // Without groups:read the groups cannot be named, only counted.
    expect(row.getByText('All groups')).toBeInTheDocument();
  });
});
