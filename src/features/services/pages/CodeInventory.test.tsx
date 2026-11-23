// Tests for the Inventory view (the old Code inventory tab), run through the whole app against the dev mock API: the masked stock in the list
// grammar of the page (a Quick Search box, status squares, the "With selected" strip, the pinned footer) with its filters in the address,
// Import codes… (paste or upload, the server's counts of imported, duplicate and rejected codes) and Void unsold codes.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { listInventoryCodes } from '../api';
import { dialogOf, openProducts } from '../test/productsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

// The service filter offers the services of the kind on the strip: the stock these tests read is the Server kind's.
const INVENTORY = '/products?view=inventory&type=server';
const UNLOCKTOOL = 16;

const table = async () => within(await screen.findByRole('table', { name: 'Code inventory' }));
// The pinned footer: "Results: a - b of N" is the count of the filtered stock.
const results = (text: string) => screen.findByText(`Results: ${text}`);
// The "With selected" strip names the number of ticked codes.
const strip = (ticked = 0) =>
  within(screen.getByRole('group', { name: ticked > 0 ? `With selected (${ticked}):` : 'With selected:' }));

describe('the stock', () => {
  it('lists the codes masked to their last four characters, newest first, 25 a page', async () => {
    const user = userEvent.setup();
    const app = await openProducts(INVENTORY);
    expect(await results('1 - 25 of 30')).toBeInTheDocument();
    expect((await table()).getAllByRole('row')).toHaveLength(26);
    expect(screen.queryByText(/Z3X-1000-A1B2/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(app.location()).toBe(`${INVENTORY}&page=2`);
    expect(await results('26 - 30 of 30')).toBeInTheDocument();
    expect((await table()).getAllByRole('row')).toHaveLength(6);
  });

  it('shows a sold code with the order it went to, and a void one', async () => {
    await openProducts(`${INVENTORY}&service=${UNLOCKTOOL}`);
    const link = await screen.findByRole('link', { name: '#48100' });
    const sold = within(link.closest('tr') as HTMLElement);
    expect(sold.getByText('••••••••A1B2')).toBeInTheDocument();
    // The status is a square and its word, not a badge.
    expect(sold.getByText('Sold').closest('.badge')).toBeNull();
    expect(sold.getByText('Sold').firstElementChild).toHaveClass('status-sq', 'status-sq-off');
    expect(sold.getByText('UnlockTool 1-Day License')).toBeInTheDocument();
    expect(sold.getByRole('link', { name: '#48100' })).toHaveAttribute('href', '/orders?order=48100');
    expect(sold.getByText('B-0001')).toBeInTheDocument();
    expect(
      within(screen.getByRole('table', { name: 'Code inventory' })).getByText('Void'),
    ).toBeInTheDocument();
  });

  it('filters by service and status and keeps both in the address', async () => {
    const user = userEvent.setup();
    const app = await openProducts(INVENTORY);
    await results('1 - 25 of 30');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter by service' }),
      'UnlockTool 1-Day License',
    );
    await waitFor(() => expect(app.location()).toBe(`${INVENTORY}&service=16`));
    expect(await results('1 - 12 of 12')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'Sold');
    await waitFor(() => expect(app.location()).toBe(`${INVENTORY}&service=16&status=sold`));
    expect(await results('1 - 4 of 4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe(INVENTORY);
    expect(await results('1 - 25 of 30')).toBeInTheDocument();
  });

  it('says so when no code matches', async () => {
    await openProducts(`${INVENTORY}&status=reserved`);
    expect(await screen.findByText('No codes match')).toBeInTheDocument();
  });
});

describe('the layout of the list', () => {
  it('has a Quick Search box with the filters and a refresh tool, and no card', async () => {
    await openProducts(INVENTORY);
    await results('1 - 25 of 30');
    const box = within(screen.getByRole('group', { name: 'Quick Search' }));
    expect(box.getByRole('combobox', { name: 'Filter by service' })).toBeInTheDocument();
    expect(box.getByRole('combobox', { name: 'Filter by status' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh the list' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Inventory' }).querySelector('.panel')).toBeNull();
  });

  it('draws every status as a square and its word, and no badge', async () => {
    await openProducts(`${INVENTORY}&service=${UNLOCKTOOL}`);
    await results('1 - 12 of 12');
    const rows = (await table()).getAllByRole('row').slice(1);
    const squares = rows.map((row) => row.querySelector('.status-sq'));
    expect(squares.every((square) => square !== null)).toBe(true);
    expect(rows.some((row) => row.querySelector('.badge'))).toBe(false);
    expect((await table()).getByText('Void').firstElementChild).toHaveClass('status-sq-crit');
  });

  it('puts Import codes… in the pinned footer, over the pager, and not at the top of the view', async () => {
    await openProducts(INVENTORY);
    await results('1 - 25 of 30');
    const bar = screen.getByRole('button', { name: 'Import codes…' }).closest('.pinned-bar') as HTMLElement;
    expect(bar).not.toBeNull();
    expect(bar.querySelector('.btn-primary')).toBe(screen.getByRole('button', { name: 'Import codes…' }));
    expect(within(bar).getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  it('changes the page size from the footer and goes back to the first page', async () => {
    const user = userEvent.setup();
    const app = await openProducts(`${INVENTORY}&page=2`);
    await results('26 - 30 of 30');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Page size:' }), '50');
    expect(await results('1 - 30 of 30')).toBeInTheDocument();
    expect(app.location()).toBe(INVENTORY);
    expect((await table()).getAllByRole('row')).toHaveLength(31);
  });

  it('ticks every code of the page with Check All and unticks them with Uncheck All', async () => {
    const user = userEvent.setup();
    await openProducts(INVENTORY);
    await results('1 - 25 of 30');
    expect(strip().getByRole('button', { name: 'Void unsold codes…' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Check All' }));
    expect(strip(25).getByRole('button', { name: 'Void unsold codes…' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Uncheck All' }));
    expect(strip().getByRole('button', { name: 'Void unsold codes…' })).toBeDisabled();
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
    await openProducts(INVENTORY);
    await results('1 - 25 of 30');
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
    expect(await results('1 - 25 of 32')).toBeInTheDocument();
    const added = (await listInventoryCodes({ filters: { serviceId: UNLOCKTOOL, status: 'available' } }))
      .data;
    expect(added.find((code) => code.maskedCode.endsWith('ZZZ2'))).toMatchObject({ batchRef: 'INV-77' });
  });

  it('reads a text file into the box, one code per line', async () => {
    const user = userEvent.setup();
    await openProducts(`${INVENTORY}&service=${UNLOCKTOOL}`);
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
    await openProducts(INVENTORY);
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
    await openProducts(INVENTORY);
    const dialog = await openImport(user);
    await user.click(dialog.getByRole('button', { name: 'Import codes' }));
    expect(await dialog.findByText('Choose a service.')).toBeInTheDocument();
    expect(dialog.getByText('Add at least one code.')).toBeInTheDocument();
  });
});

describe('Void unsold codes', () => {
  it('voids only the ticked codes that are unsold, after a review step', async () => {
    const user = userEvent.setup();
    await openProducts(`${INVENTORY}&service=${UNLOCKTOOL}`);
    await results('1 - 12 of 12');
    // Newest first: the voided code, then unsold codes; the sold ones come last.
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 29' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select row 28' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select row 22' }));
    await user.click(strip(3).getByRole('button', { name: 'Void unsold codes…' }));

    const dialog = dialogOf('Void 2 codes?');
    expect(dialog.getByText(/can never be sold/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Void codes' }));
    expect(await screen.findByText('2 codes voided')).toBeInTheDocument();
    expect(screen.getByText('They can no longer be sold.')).toBeInTheDocument();
    const voided = (await listInventoryCodes({ filters: { serviceId: UNLOCKTOOL, status: 'void' } })).total;
    expect(voided).toBe(3);
    // Nothing is ticked any more: the strip stays, with its buttons off.
    expect(strip().getByRole('button', { name: 'Void unsold codes…' })).toBeDisabled();
  });

  it('cannot void when only sold codes are ticked', async () => {
    const user = userEvent.setup();
    await openProducts(`${INVENTORY}&service=${UNLOCKTOOL}&status=sold`);
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 19' }));
    const button = strip(1).getByRole('button', { name: 'Void unsold codes…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'None of the ticked codes is unsold');
  });
});

describe('permissions', () => {
  it('lets inventory:read see the stock but not change it', async () => {
    const user = userEvent.setup();
    await openProducts(INVENTORY, { permissions: ['inventory:read'] });
    expect(await results('1 - 25 of 30')).toBeInTheDocument();
    const importButton = screen.getByRole('button', { name: 'Import codes…' });
    expect(importButton).toBeDisabled();
    expect(importButton).toHaveAttribute('title', 'You need the inventory:write and catalog:read permission');
    // Without catalog:read the service names are not available, so the service filter is left out.
    expect(screen.queryByRole('combobox', { name: 'Filter by service' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 29' }));
    expect(strip(1).getByRole('button', { name: 'Void unsold codes…' })).toBeDisabled();
  });
});
