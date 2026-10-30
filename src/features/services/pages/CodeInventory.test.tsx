// Tests for the Code inventory tab, run through the whole app against the dev mock API: the masked stock with its filters in the address,
// Import codes… (paste or upload, the server's counts of imported, duplicate and rejected codes) and Void selected unsold codes.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { listInventoryCodes } from '../api';
import { dialogOf, openServices } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

const INVENTORY = '/services?tab=inventory';
const UNLOCKTOOL = 16;

const table = async () => within(await screen.findByRole('table', { name: 'Code inventory' }));

describe('the stock', () => {
  it('lists the codes masked to their last four characters, newest first, 25 a page', async () => {
    const user = userEvent.setup();
    const app = await openServices(INVENTORY);
    expect(await screen.findByText('30 codes')).toBeInTheDocument();
    expect((await table()).getAllByRole('row')).toHaveLength(26);
    expect(screen.queryByText(/Z3X-1000-A1B2/)).not.toBeInTheDocument();
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(app.location()).toBe('/services?tab=inventory&page=2');
    expect((await table()).getAllByRole('row')).toHaveLength(6);
  });

  it('shows a sold code with the order it went to, and a void one', async () => {
    await openServices(`${INVENTORY}&service=${UNLOCKTOOL}`);
    const link = await screen.findByRole('link', { name: '#48100' });
    const sold = within(link.closest('tr') as HTMLElement);
    expect(sold.getByText('••••••••A1B2')).toBeInTheDocument();
    expect(sold.getByText('Sold')).toBeInTheDocument();
    expect(sold.getByText('UnlockTool 1-Day License')).toBeInTheDocument();
    expect(sold.getByRole('link', { name: '#48100' })).toHaveAttribute('href', '/orders?order=48100');
    expect(sold.getByText('B-0001')).toBeInTheDocument();
    expect(
      within(screen.getByRole('table', { name: 'Code inventory' })).getByText('Void'),
    ).toBeInTheDocument();
  });

  it('filters by service and status and keeps both in the address', async () => {
    const user = userEvent.setup();
    const app = await openServices(INVENTORY);
    await screen.findByText('30 codes');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter by service' }),
      'UnlockTool 1-Day License',
    );
    await waitFor(() => expect(app.location()).toBe('/services?tab=inventory&service=16'));
    expect(await screen.findByText('12 codes')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'Sold');
    await waitFor(() => expect(app.location()).toBe('/services?tab=inventory&service=16&status=sold'));
    expect(await screen.findByText('4 codes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/services?tab=inventory');
    expect(await screen.findByText('30 codes')).toBeInTheDocument();
  });

  it('says so when no code matches', async () => {
    await openServices(`${INVENTORY}&status=reserved`);
    expect(await screen.findByText('No codes match')).toBeInTheDocument();
  });
});

describe('Import codes', () => {
  async function openImport(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: 'Import codes…' }));
    const dialog = dialogOf('Import codes');
    await dialog.findByRole('option', { name: 'UnlockTool 1-Day License' });
    return dialog;
  }

  it('pastes codes and shows the server’s counts of imported, duplicate and rejected codes', async () => {
    const user = userEvent.setup();
    await openServices(INVENTORY);
    await screen.findByText('30 codes');
    const dialog = await openImport(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Service' }), 'UnlockTool 1-Day License');
    await user.click(dialog.getByRole('textbox', { name: 'Codes' }));
    await user.paste('UT-9001-ZZZ1\nUT-9002-ZZZ2\n\nUT-9001-ZZZ1\nUT-1000-A1B2\nabc\n');
    expect(dialog.getByText('5 codes ready.')).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Batch reference' }), 'INV-77');
    await user.click(dialog.getByRole('button', { name: 'Import 5 codes' }));

    const result = dialogOf('Import finished');
    expect(await result.findByText('UnlockTool 1-Day License')).toBeInTheDocument();
    expect(
      within(result.getByText('Imported').nextElementSibling as HTMLElement).getByText('2'),
    ).toBeInTheDocument();
    expect(
      within(result.getByText('Duplicates, skipped').nextElementSibling as HTMLElement).getByText('2'),
    ).toBeInTheDocument();
    expect(
      within(result.getByText('Rejected').nextElementSibling as HTMLElement).getByText('1'),
    ).toBeInTheDocument();
    expect(result.getByText('INV-77')).toBeInTheDocument();

    await user.click(result.getByRole('button', { name: 'Done' }));
    expect(await screen.findByText('32 codes')).toBeInTheDocument();
    const added = (await listInventoryCodes({ filters: { serviceId: UNLOCKTOOL, status: 'available' } }))
      .data;
    expect(added.find((code) => code.maskedCode.endsWith('ZZZ2'))).toMatchObject({ batchRef: 'INV-77' });
  });

  it('reads a text file into the box, one code per line', async () => {
    const user = userEvent.setup();
    await openServices(`${INVENTORY}&service=${UNLOCKTOOL}`);
    const dialog = await openImport(user);
    expect(dialog.getByRole('combobox', { name: 'Service' })).toHaveDisplayValue('UnlockTool 1-Day License');
    await user.upload(
      dialog.getByLabelText('Or upload a text file'),
      new File(['UT-7001-AAAA\nUT-7002-BBBB\n'], 'codes.txt', { type: 'text/plain' }),
    );
    await waitFor(() =>
      expect(dialog.getByRole('textbox', { name: 'Codes' })).toHaveValue('UT-7001-AAAA\nUT-7002-BBBB\n'),
    );
    expect(dialog.getByText('2 codes ready.')).toBeInTheDocument();
  });

  it('says so, with a Retry, when the services could not be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(http.get('*/admin/services', () => problem(403, 'FORBIDDEN', 'No access', 'Closed.')));
    await openServices(INVENTORY);
    await user.click(await screen.findByRole('button', { name: 'Import codes…' }));
    const dialog = dialogOf('Import codes');
    expect(await dialog.findByText(/Could not load the services\./)).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(dialog.getByRole('button', { name: 'Retry' }));
    expect(await dialog.findByRole('option', { name: 'UnlockTool 1-Day License' })).toBeInTheDocument();
    expect(dialog.queryByText(/Could not load the services/)).not.toBeInTheDocument();
  });

  it('asks for a service and some codes before it calls the server', async () => {
    const user = userEvent.setup();
    await openServices(INVENTORY);
    const dialog = await openImport(user);
    await user.click(dialog.getByRole('button', { name: 'Import codes' }));
    expect(await dialog.findByText('Choose a service.')).toBeInTheDocument();
    expect(dialog.getByText('Add at least one code.')).toBeInTheDocument();
  });
});

describe('Void selected unsold codes', () => {
  it('voids only the ticked codes that are unsold, after a review step', async () => {
    const user = userEvent.setup();
    await openServices(`${INVENTORY}&service=${UNLOCKTOOL}`);
    await screen.findByText('12 codes');
    // Newest first: the voided code, then unsold codes; the sold ones come last.
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 29' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select row 28' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select row 22' }));
    const bar = within(screen.getByRole('region', { name: 'Selected codes' }));
    expect(bar.getByText('3 selected')).toBeInTheDocument();
    expect(bar.getByText('2 unsold')).toBeInTheDocument();
    await user.click(bar.getByRole('button', { name: 'Void selected unsold codes…' }));

    const dialog = dialogOf('Void 2 codes?');
    expect(dialog.getByText(/can never be sold/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Void codes' }));
    expect(await screen.findByText('2 codes voided')).toBeInTheDocument();
    expect(screen.getByText('They can no longer be sold.')).toBeInTheDocument();
    const voided = (await listInventoryCodes({ filters: { serviceId: UNLOCKTOOL, status: 'void' } })).total;
    expect(voided).toBe(3);
    expect(screen.queryByRole('region', { name: 'Selected codes' })).not.toBeInTheDocument();
  });

  it('cannot void when only sold codes are ticked', async () => {
    const user = userEvent.setup();
    await openServices(`${INVENTORY}&service=${UNLOCKTOOL}&status=sold`);
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 19' }));
    const button = within(screen.getByRole('region', { name: 'Selected codes' })).getByRole('button', {
      name: 'Void selected unsold codes…',
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'None of the ticked codes is unsold');
  });
});

describe('permissions', () => {
  it('lets inventory:read see the stock but not change it', async () => {
    const user = userEvent.setup();
    await openServices(INVENTORY, { permissions: ['inventory:read'] });
    expect(await screen.findByText('30 codes')).toBeInTheDocument();
    const importButton = screen.getByRole('button', { name: 'Import codes…' });
    expect(importButton).toBeDisabled();
    expect(importButton).toHaveAttribute('title', 'You need the inventory:write and catalog:read permission');
    // Without catalog:read the service names are not available, so the service filter is left out.
    expect(screen.queryByRole('combobox', { name: 'Filter by service' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 29' }));
    expect(
      within(screen.getByRole('region', { name: 'Selected codes' })).getByRole('button', {
        name: 'Void selected unsold codes…',
      }),
    ).toBeDisabled();
  });
});
