// Tests for the listing dialogs that open from a listing's id (the Catalog's row menu): the listing is read once, then the editor or the
// price dialog opens on it, and a failed read shows the server's words with Try again. They run against the dev mock API.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { useState } from 'react';
import { Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { ListingEditDialogById, PriceDialogById } from '../components/ListingDialogsById';
import { dialogOf } from '../test/storefrontPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const ATT = 'AT&T USA Premier Unlock';
const ATT_LISTING = 5; // its listing in the mock seed

/** A row menu's stand-in: two buttons that open the dialogs for one listing id, and a line that says whether one is open. */
function Host() {
  const [open, setOpen] = useState<'edit' | 'price' | null>(null);
  const close = () => setOpen(null);
  return (
    <>
      <button onClick={() => setOpen('edit')}>Edit shop page</button>
      <button onClick={() => setOpen('price')}>Shop price</button>
      <p>{open ? 'A dialog is open' : 'No dialog'}</p>
      {open === 'edit' && <ListingEditDialogById listingId={ATT_LISTING} name={ATT} onClose={close} />}
      {open === 'price' && <PriceDialogById listingId={ATT_LISTING} name={ATT} onClose={close} />}
    </>
  );
}

/** The dialog once its form is on screen: the loading dialog is replaced by the form's own dialog, so an early lookup goes stale. */
async function formDialog(name: string, field: string | RegExp) {
  await screen.findByRole('textbox', { name: field });
  return dialogOf(name);
}

async function openHost() {
  await signInAs();
  renderShell('/probe', <Route path="/probe" element={<Host />} />);
  return screen.findByRole('button', { name: 'Edit shop page' });
}

describe('the editor by id', () => {
  it('reads the listing once and opens the editor on its content', async () => {
    const user = userEvent.setup();
    const edit = await openHost();
    const requests = recordRequests();
    await user.click(edit);
    const dialog = await formDialog('Edit listing', 'Public title');
    expect(dialog.getByRole('textbox', { name: 'Public title' })).toHaveValue(ATT);
    const reads = requests
      .sent()
      .filter(
        (sent) =>
          sent.method === 'GET' && sent.url.pathname.endsWith(`/admin/service-listings/${ATT_LISTING}`),
      );
    expect(reads).toHaveLength(1);
  });

  it('shows the server’s words with Try again when the listing cannot be read, and opens the editor after it', async () => {
    const user = userEvent.setup();
    const edit = await openHost();
    mockServer.use(
      http.get('*/admin/service-listings/:id', () =>
        problem(500, 'INTERNAL_ERROR', 'Server error', 'The listing is not available.'),
      ),
    );
    await user.click(edit);
    const dialog = dialogOf('Edit listing');
    expect(await dialog.findByText('The listing is not available.')).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(dialog.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('textbox', { name: 'Public title' })).toHaveValue(ATT);
  });

  it('closes from the loading dialog', async () => {
    const user = userEvent.setup();
    const edit = await openHost();
    mockServer.use(
      http.get('*/admin/service-listings/:id', () =>
        problem(500, 'INTERNAL_ERROR', 'Server error', 'The listing is not available.'),
      ),
    );
    await user.click(edit);
    const dialog = dialogOf('Edit listing');
    await dialog.findByText('The listing is not available.');
    // The frame has a close icon and the footer a Close button, both named Close.
    await user.click(dialog.getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(screen.getByText('No dialog')).toBeInTheDocument();
  });
});

describe('the price dialog by id', () => {
  it('reads the listing and opens the price dialog with the floor the server works out', async () => {
    const user = userEvent.setup();
    await openHost();
    await user.click(screen.getByRole('button', { name: 'Shop price' }));
    const dialog = await formDialog('Storefront price', /^Price shown to customers/);
    expect(dialog.getByText(/^Floor \$19\.01: the lowest price the server accepts/)).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: /^Price shown to customers/ })).toHaveValue('25.99');
  });

  it('saves a price and closes', async () => {
    const user = userEvent.setup();
    await openHost();
    await user.click(screen.getByRole('button', { name: 'Shop price' }));
    const dialog = await formDialog('Storefront price', /^Price shown to customers/);
    const price = dialog.getByRole('textbox', { name: /^Price shown to customers/ });
    await user.clear(price);
    await user.type(price, '30');
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(await screen.findByText('Price saved')).toBeInTheDocument();
    expect(screen.getByText('No dialog')).toBeInTheDocument();
  });
});
