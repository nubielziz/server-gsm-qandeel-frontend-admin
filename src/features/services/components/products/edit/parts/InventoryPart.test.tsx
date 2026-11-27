// Tests for the Inventory part of the edit view, run inside the real app shell against the dev mock API: the counts of one service's codes by
// status, the masked list with its filter, the footer and the void action, Import codes in place (paste or file, the server's counts and
// words), the unsaved report to the host, and the permission locks. The part is mounted in a small route of its own, the way the host does.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { listInventoryCodes } from '../../../../api';
import { useServiceGrants } from '../../../../hooks/useServiceGrants';
import { openProducts } from '../../../../test/productsPage';
import { recordRequests } from '../../../../test/requests';
import type { ServiceDetail } from '../../../../types';
import { InventoryPart } from './InventoryPart';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

// Service 16 of the mock seed holds twelve codes: four sold, seven available, one void (newest first: the void one, then the unsold ones).
const UNLOCKTOOL = 16;
const UNLOCKTOOL_NAME = 'UnlockTool 1-Day License';
const NO_WRITE = 'You need the inventory:write permission';

function Harness({
  service,
  onDirtyChange,
}: {
  service: ServiceDetail;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const grants = useServiceGrants();
  return <InventoryPart service={service} grants={grants} onDirtyChange={onDirtyChange} />;
}

type Options = { serviceId?: number; name?: string; permissions?: string[] };

/** Mounts the part for a service and waits until its "Stored codes" section is on screen. */
async function show({ serviceId = UNLOCKTOOL, name = UNLOCKTOOL_NAME, permissions }: Options = {}) {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
  const onDirtyChange = vi.fn();
  const service = { id: serviceId, name, type: 'server' } as ServiceDetail;
  const view = renderShell(
    '/probe',
    <Route path="/probe" element={<Harness service={service} onDirtyChange={onDirtyChange} />} />,
  );
  await screen.findByRole('heading', { level: 3, name: 'Stored codes' }, { timeout: 10_000 });
  return { onDirtyChange, view };
}

const table = () => screen.findByRole('table', { name: 'Stored codes' });
const rowsOf = async () => within(await table()).getAllByRole('row');
const counts = () => screen.getByRole('list', { name: 'Codes in stock' });
const footer = () => within(screen.getByRole('navigation', { name: 'Pagination' }));
const codesBox = () => screen.getByRole('textbox', { name: 'Codes' });

describe('the stored codes of a service', () => {
  it('counts the codes by status and lists them masked, newest first', async () => {
    await show();
    await waitFor(() => expect(counts()).toHaveTextContent('Available7Reserved0Sold4Void1'));
    // The header row and the twelve codes of this service (the stock of the other services is not listed).
    await waitFor(async () => expect(await rowsOf()).toHaveLength(13));
    expect(footer().getByText('Results: 1 - 12 of 12')).toBeInTheDocument();
    const [, newest] = await rowsOf();
    expect(within(newest).getByText('Void')).toBeInTheDocument();
    expect(within(await table()).queryByText(/UT-1000-A1B2/)).not.toBeInTheDocument();
    expect(within(await table()).getAllByText(/^•+[A-Z0-9]{4}$/).length).toBe(12);
  });

  it('shows a sold code with the order it went to and its batch', async () => {
    await show();
    const link = await screen.findByRole('link', { name: '#48100' });
    const sold = within(link.closest('tr') as HTMLElement);
    expect(sold.getByText('••••••••A1B2')).toBeInTheDocument();
    expect(sold.getByText('Sold')).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/orders?order=48100');
    expect(sold.getByText('B-0001')).toBeInTheDocument();
  });

  it('filters by status, and leaves the counts of every status as they are', async () => {
    const user = userEvent.setup();
    await show();
    await waitFor(async () => expect(await rowsOf()).toHaveLength(13));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Sold');
    await waitFor(async () => expect(await rowsOf()).toHaveLength(5));
    await waitFor(() => expect(footer().getByText('Results: 1 - 4 of 4')).toBeInTheDocument());
    expect(counts()).toHaveTextContent('Available7Reserved0Sold4Void1');
  });

  it('says so when no code has the status, and shows them all again on request', async () => {
    const user = userEvent.setup();
    await show();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Reserved');
    expect(await screen.findByText('No codes match')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all statuses' }));
    await waitFor(async () => expect(await rowsOf()).toHaveLength(13));
  });

  it('says so for a service with no code in stock', async () => {
    await show({ serviceId: 1, name: 'iCloud Clean / Lost Check' });
    expect(await screen.findByText('No codes in stock')).toBeInTheDocument();
    await waitFor(() => expect(counts()).toHaveTextContent('Available0Reserved0Sold0Void0'));
    expect(footer().getByText('Results: 0')).toBeInTheDocument();
  });

  it('reads the counts and the list again on Refresh', async () => {
    const user = userEvent.setup();
    await show();
    await waitFor(async () => expect(await rowsOf()).toHaveLength(13));
    const requests = recordRequests();
    const reads = () =>
      requests.sent().filter((sent) => sent.url.pathname === '/admin/inventory-codes').length;
    await user.click(screen.getByRole('button', { name: 'Refresh the list' }));
    // Four counts and the list.
    await waitFor(() => expect(reads()).toBeGreaterThanOrEqual(5));
  });

  it('ticks every code of the page on Check All and none on Uncheck All', async () => {
    const user = userEvent.setup();
    await show();
    await waitFor(async () => expect(await rowsOf()).toHaveLength(13));
    expect(screen.getByText('With selected:')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check All' }));
    expect(screen.getByText('With selected (12):')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Uncheck All' }));
    expect(screen.getByText('With selected:')).toBeInTheDocument();
  });
});

describe('Import codes', () => {
  it('pastes codes and tells the server’s counts of imported, duplicate and unreadable codes in place', async () => {
    const user = userEvent.setup();
    const { onDirtyChange } = await show();
    await waitFor(() => expect(counts()).toHaveTextContent('Available7Reserved0Sold4Void1'));
    await user.click(codesBox());
    await user.paste('UT-9001-ZZZ1\nUT-9002-ZZZ2\n\nUT-9001-ZZZ1\nUT-1000-A1B2\nabc\n');
    expect(screen.getByText('5 codes ready.')).toBeInTheDocument();
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    await user.click(screen.getByRole('button', { name: 'More options' }));
    await user.type(screen.getByRole('textbox', { name: 'Batch reference' }), 'INV-77');
    await user.click(screen.getByRole('button', { name: 'Import codes' }));

    expect(
      await screen.findByText(
        'Imported 2 codes. 2 duplicates skipped. 1 line could not be read. Batch INV-77.',
      ),
    ).toBeInTheDocument();
    // The form is empty again, nothing is unsaved, and the counts and the list follow the import.
    expect(codesBox()).toHaveValue('');
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
    await waitFor(() => expect(counts()).toHaveTextContent('Available9Reserved0Sold4Void1'));
    await waitFor(async () => expect(await rowsOf()).toHaveLength(15));
    const added = (await listInventoryCodes({ filters: { serviceId: UNLOCKTOOL, status: 'available' } }))
      .data;
    expect(added.find((code) => code.maskedCode.endsWith('ZZZ2'))).toMatchObject({ batchRef: 'INV-77' });
  });

  it('reads a text file into the box, one code per line', async () => {
    const user = userEvent.setup();
    await show();
    await user.upload(
      screen.getByLabelText('Text file'),
      new File(['UT-7001-AAAA\nUT-7002-BBBB\n'], 'codes.txt', { type: 'text/plain' }),
    );
    await waitFor(() => expect(codesBox()).toHaveValue('UT-7001-AAAA\nUT-7002-BBBB\n'));
    expect(screen.getByText('2 codes ready.')).toBeInTheDocument();
  });

  it('asks for some codes before it calls the server', async () => {
    const user = userEvent.setup();
    await show();
    const requests = recordRequests();
    await user.click(screen.getByRole('button', { name: 'Import codes' }));
    expect(await screen.findByText('Add at least one code.')).toBeInTheDocument();
    expect(requests.sent().filter((sent) => sent.method === 'POST')).toHaveLength(0);
  });

  it('puts the words of the server under the field they belong to, and keeps the codes in the box', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/services/:id/inventory/import', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'batchRef', message: 'Use 1 to 40 letters, digits, dots, underscores or hyphens.' },
        ]),
      ),
    );
    const { onDirtyChange } = await show();
    await user.click(codesBox());
    await user.paste('UT-9001-ZZZ1');
    await user.click(screen.getByRole('button', { name: 'More options' }));
    await user.type(screen.getByRole('textbox', { name: 'Batch reference' }), 'bad ref');
    // Fold it again: the message must open it, so nothing wrong is out of sight.
    await user.click(screen.getByRole('button', { name: 'Hide more options' }));
    expect(screen.getByLabelText('Batch reference')).not.toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Import codes' }));
    expect(
      await screen.findByText('Use 1 to 40 letters, digits, dots, underscores or hyphens.'),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Batch reference' })).toHaveAttribute('aria-invalid', 'true');
    expect(codesBox()).toHaveValue('UT-9001-ZZZ1');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it('folds the Batch reference away and sends no reference when none is typed', async () => {
    const user = userEvent.setup();
    await show();
    expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Batch reference')).not.toBeVisible();
    const requests = recordRequests();
    await user.click(codesBox());
    await user.paste('UT-9001-ZZZ1\nUT-9002-ZZZ2');
    await user.click(screen.getByRole('button', { name: 'Import codes' }));
    expect(await screen.findByText(/Imported 2 codes\./)).toBeInTheDocument();
    const posts = requests.sent().filter((sent) => sent.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0]?.body).toEqual({ codes: ['UT-9001-ZZZ1', 'UT-9002-ZZZ2'] });
  });

  it('puts the server’s refusal of a service that is not delivered from code stock under the codes box', async () => {
    const user = userEvent.setup();
    // Service 17 (Chimera Tool) is not delivered from code stock: the part is mounted on it directly, as an old link could.
    const { onDirtyChange } = await show({ serviceId: 17, name: 'Chimera Tool 1 Month' });
    await user.click(codesBox());
    await user.paste('CHM-0001-AAAA');
    await user.click(screen.getByRole('button', { name: 'Import codes' }));
    expect(
      await screen.findByText('Turn on Delivered from code stock for this service first.'),
    ).toBeInTheDocument();
    expect(codesBox()).toHaveAttribute('aria-invalid', 'true');
    expect(codesBox()).toHaveValue('CHM-0001-AAAA');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect((await listInventoryCodes({ filters: { serviceId: 17 } })).total).toBe(0);
  });

  it('says false to the host when the part goes away with codes still in the box', async () => {
    const user = userEvent.setup();
    const { onDirtyChange, view } = await show();
    await user.click(codesBox());
    await user.paste('UT-9001-ZZZ1');
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    view.unmount();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });
});

describe('Void unsold codes', () => {
  it('voids only the ticked codes that are unsold, after a question', async () => {
    const user = userEvent.setup();
    await show();
    await waitFor(() => expect(counts()).toHaveTextContent('Available7Reserved0Sold4Void1'));
    // Newest first: the void code is 30, then unsold codes; the sold ones are the four oldest (19 to 22).
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 29' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select row 28' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select row 22' }));
    expect(screen.getByText('With selected (3):')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Void unsold codes…' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Void 2 codes?' }));
    expect(dialog.getByText(/can never be sold/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Void codes' }));
    expect(await screen.findByText('2 codes voided')).toBeInTheDocument();
    await waitFor(() => expect(counts()).toHaveTextContent('Available5Reserved0Sold4Void3'));
    await waitFor(() => expect(screen.getByText('With selected:')).toBeInTheDocument());
  });

  it('cannot void when only sold codes are ticked', async () => {
    const user = userEvent.setup();
    await show();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Sold');
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 19' }));
    const button = screen.getByRole('button', { name: 'Void unsold codes…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'None of the ticked codes is unsold');
  });

  it('clears the ticks when the filter changes, so no code is voided out of sight', async () => {
    const user = userEvent.setup();
    await show();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 29' }));
    expect(screen.getByText('With selected (1):')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Available');
    await waitFor(() => expect(screen.getByText('With selected:')).toBeInTheDocument());
  });
});

describe('permissions', () => {
  it('lets inventory:read see the stock but not change it, and names the missing permission', async () => {
    const user = userEvent.setup();
    await show({ permissions: ['inventory:read'] });
    await waitFor(() => expect(counts()).toHaveTextContent('Available7Reserved0Sold4Void1'));
    expect(codesBox()).toBeDisabled();
    expect(codesBox()).toHaveAttribute('title', NO_WRITE);
    const importButton = screen.getByRole('button', { name: 'Import codes' });
    expect(importButton).toBeDisabled();
    expect(importButton.parentElement).toHaveAttribute('title', NO_WRITE);
    expect(screen.getByLabelText('Text file')).toBeDisabled();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 29' }));
    const voidButton = screen.getByRole('button', { name: 'Void unsold codes…' });
    expect(voidButton).toBeDisabled();
    expect(voidButton).toHaveAttribute('title', NO_WRITE);
  });
});

describe('in the edit view', () => {
  it('is the Inventory part of the service the address names', async () => {
    await openProducts(`/products?view=edit&type=server&id=${UNLOCKTOOL}&part=inventory`);
    expect(await screen.findByRole('heading', { level: 3, name: 'Stored codes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Import codes' })).toBeInTheDocument();
    const current = within(screen.getByRole('navigation', { name: 'Parts' }))
      .getAllByRole('link')
      .find((link) => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveTextContent('Inventory');
    await waitFor(() => expect(counts()).toHaveTextContent('Available7Reserved0Sold4Void1'));
  });

  it('is not a part of a service that is not delivered from code stock, even when the address names it', async () => {
    await openProducts('/products?view=edit&type=server&id=17&part=inventory');
    expect(await screen.findByRole('heading', { level: 3, name: 'Overview' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Stored codes' })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Parts' })).queryByRole('link', { name: 'Inventory' }),
    ).not.toBeInTheDocument();
  });
});
