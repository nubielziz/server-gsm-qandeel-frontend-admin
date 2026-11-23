// Tests for the listing editor of the listings table: it opens from a row with the listing's full content, sends only the
// fields that changed, shows the server's refusals under the fields, and controls the picture (client check, upload, replace,
// remove, the server's refusal). They run through the whole app against the dev mock API.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getListing, updateListing } from '../api';
import { recordRequests } from '../test/requests';
import { dialogOf, openCatalogView, rowOf } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const TABLE = 'Storefront listings';
const ATT = 'AT&T USA Premier Unlock';
const ATT_ID = 5; // its row in the mock seed

async function openEditor(
  user: ReturnType<typeof userEvent.setup>,
  name = ATT,
  options?: Parameters<typeof openCatalogView>[1],
) {
  await openCatalogView('/catalog', options);
  const row = await rowOf(TABLE, name);
  await user.click(row.getByRole('button', { name: `Edit listing ${name}` }));
  const dialog = dialogOf('Edit listing');
  // The form appears once the listing has been read.
  await dialog.findByRole('textbox', { name: 'Public title' });
  return dialog;
}

const png = (name = 'phone.png', type = 'image/png', size = 3) =>
  new File([new Uint8Array(size)], name, { type });

describe('opening the editor', () => {
  it('reads the listing and fills every field, with the facts under their heading', async () => {
    const user = userEvent.setup();
    const dialog = await openEditor(user);
    expect(dialog.getByText(ATT)).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Public title' })).toHaveValue(ATT);
    expect(dialog.getByRole('textbox', { name: 'Slug' })).toHaveValue('atandt-usa-premier-unlock');
    expect(dialog.getByText(/Changing it changes the public link\./)).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Summary' })).toHaveValue('');
    expect(dialog.getByRole('textbox', { name: 'Description (Markdown)' })).toHaveValue('');
    expect(dialog.getByRole('textbox', { name: 'Requirements (Markdown)' })).toHaveValue('');
    expect(dialog.getByRole('textbox', { name: 'Delivery note' })).toHaveValue('');
    expect(dialog.getByRole('combobox', { name: 'Brand' })).toHaveValue('Apple');
    expect(dialog.queryByRole('textbox', { name: 'Brand name' })).not.toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Carrier' })).toHaveValue('');
    expect(dialog.getByRole('combobox', { name: 'Country' })).toHaveValue('');
    expect(dialog.getByRole('textbox', { name: 'Position' })).toHaveValue(String(ATT_ID));
    expect(dialog.getByRole('checkbox', { name: 'Featured on the storefront' })).toBeChecked();
    expect(dialog.getByRole('textbox', { name: 'Search title' })).toHaveValue('');
    expect(dialog.getByRole('textbox', { name: 'Search description' })).toHaveValue('');
    expect(dialog.getByText('About the service')).toBeInTheDocument();
    expect(dialog.queryByText(/every language/)).not.toBeInTheDocument();
  });

  it('leaves the text direction alone: no field of the editor sets one', async () => {
    const user = userEvent.setup();
    const dialog = await openEditor(user);
    for (const name of [
      'Public title',
      'Slug',
      'Summary',
      'Delivery note',
      'Description (Markdown)',
      'Requirements (Markdown)',
      'Search title',
      'Search description',
    ]) {
      expect(dialog.getByRole('textbox', { name })).not.toHaveAttribute('dir');
    }
    expect(dialog.getByRole('combobox', { name: 'Country' })).not.toHaveAttribute('dir');
  });

  it('has no Edit button on a locked row', async () => {
    await openCatalogView('/catalog');
    expect((await rowOf(TABLE, 'MDM Removal, iPhone Premium')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('disables the Edit button without storefront:update', async () => {
    await openCatalogView('/catalog', { permissions: ['storefront:read'] });
    const row = await rowOf(TABLE, ATT);
    expect(row.getByRole('button', { name: `Edit listing ${ATT}` })).toBeDisabled();
  });

  it('shows the server’s words with Try again when the listing cannot be read', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/service-listings/:id', () =>
        problem(500, 'INTERNAL_ERROR', 'Server error', 'The listing is not available.'),
      ),
    );
    await openCatalogView('/catalog');
    await user.click((await rowOf(TABLE, ATT)).getByRole('button', { name: `Edit listing ${ATT}` }));
    const dialog = dialogOf('Edit listing');
    expect(await dialog.findByText('The listing is not available.')).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(dialog.getByRole('button', { name: 'Try again' }));
    // The form is a new dialog, so it is looked up again.
    expect(await screen.findByRole('textbox', { name: 'Public title' })).toBeInTheDocument();
  });
});

describe('saving', () => {
  it('sends only the changed fields and shows them in the listing afterwards', async () => {
    const user = userEvent.setup();
    const dialog = await openEditor(user);
    await user.type(dialog.getByRole('textbox', { name: 'Summary' }), 'Unlock an AT&T iPhone.');
    await user.type(dialog.getByRole('textbox', { name: 'Description (Markdown)' }), '# About');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Country' }), 'JO');
    await user.click(dialog.getByRole('checkbox', { name: 'Featured on the storefront' }));
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Listing saved')).toBeInTheDocument();
    const patch = requests.sent().find((request) => request.method === 'PATCH');
    expect(patch?.url.pathname).toBe(`/admin/service-listings/${ATT_ID}`);
    expect(patch?.body).toEqual({
      summary: 'Unlock an AT&T iPhone.',
      descriptionMd: '# About',
      country: 'JO',
      isFeatured: false,
    });
    expect(screen.queryByRole('dialog', { name: 'Edit listing' })).not.toBeInTheDocument();
    expect(await getListing(ATT_ID)).toMatchObject({
      summary: 'Unlock an AT&T iPhone.',
      country: 'JO',
      isFeatured: false,
    });
  });

  it('picks a brand the shop has a logo for and a country from the Arab countries', async () => {
    const user = userEvent.setup();
    const dialog = await openEditor(user);
    const brand = dialog.getByRole('combobox', { name: 'Brand' });
    expect(brand).toHaveValue('Apple');
    await user.selectOptions(brand, 'Samsung');
    const country = dialog.getByRole('combobox', { name: 'Country' });
    // No country, then the 22 Arab countries by name.
    expect(country.querySelectorAll('option')).toHaveLength(23);
    await user.selectOptions(country, 'Egypt');
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Listing saved')).toBeInTheDocument();
    expect(requests.sent().find((request) => request.method === 'PATCH')?.body).toEqual({
      brand: 'Samsung',
      country: 'EG',
    });
  });

  it('takes a brand typed by hand under Other', async () => {
    const user = userEvent.setup();
    const dialog = await openEditor(user);
    expect(dialog.queryByRole('textbox', { name: 'Brand name' })).not.toBeInTheDocument();
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Brand' }), 'Other (type a name)…');
    const name = dialog.getByRole('textbox', { name: 'Brand name' });
    // The picked brand is not what Other means: the box starts empty.
    expect(name).toHaveValue('');
    await user.type(name, 'Acme Phones');
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Listing saved')).toBeInTheDocument();
    expect(requests.sent().find((request) => request.method === 'PATCH')?.body).toEqual({
      brand: 'Acme Phones',
    });
    expect(await getListing(ATT_ID)).toMatchObject({ brand: 'Acme Phones' });
  });

  it('opens a brand typed by hand under Other and keeps a country saved before selectable', async () => {
    const user = userEvent.setup();
    await openCatalogView('/catalog');
    await updateListing(ATT_ID, { brand: 'Acme Phones', country: 'GB' });
    const row = await rowOf(TABLE, ATT);
    await user.click(row.getByRole('button', { name: `Edit listing ${ATT}` }));
    const dialog = dialogOf('Edit listing');
    await dialog.findByRole('textbox', { name: 'Public title' });
    expect(dialog.getByRole('combobox', { name: 'Brand' })).toHaveDisplayValue('Other (type a name)…');
    expect(dialog.getByRole('textbox', { name: 'Brand name' })).toHaveValue('Acme Phones');
    const country = dialog.getByRole('combobox', { name: 'Country' });
    expect(country).toHaveValue('GB');
    expect(country).toHaveDisplayValue('United Kingdom (saved before)');
    // Back to a brand of the list: the box goes away and the brand is sent.
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Brand' }), 'Nokia');
    expect(dialog.queryByRole('textbox', { name: 'Brand name' })).not.toBeInTheDocument();
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Listing saved')).toBeInTheDocument();
    expect(requests.sent().find((request) => request.method === 'PATCH')?.body).toEqual({ brand: 'Nokia' });
  });

  it('says nothing changed and sends no request when the form is as it was read', async () => {
    const user = userEvent.setup();
    const dialog = await openEditor(user);
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(requests.sent().some((request) => request.method === 'PATCH')).toBe(false);
  });

  it('asks for a title, a slug and a whole position before it sends anything', async () => {
    const user = userEvent.setup();
    const dialog = await openEditor(user);
    await user.clear(dialog.getByRole('textbox', { name: 'Public title' }));
    await user.clear(dialog.getByRole('textbox', { name: 'Slug' }));
    await user.clear(dialog.getByRole('textbox', { name: 'Position' }));
    await user.type(dialog.getByRole('textbox', { name: 'Position' }), '1.5');
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await dialog.findByText('Enter the title customers see.')).toBeInTheDocument();
    expect(dialog.getByText('Enter a slug.')).toBeInTheDocument();
    expect(dialog.getByText('Enter a whole number from 0 to 1,000,000.')).toBeInTheDocument();
    expect(requests.sent().some((request) => request.method === 'PATCH')).toBe(false);
  });

  it('shows a slug already in use under the slug and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const dialog = await openEditor(user);
    const slug = dialog.getByRole('textbox', { name: 'Slug' });
    await user.clear(slug);
    await user.type(slug, 'ee-uk-unlock');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await dialog.findByText('The slug ee-uk-unlock is already used.')).toBeInTheDocument();
    expect(slug).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog', { name: 'Edit listing' })).toBeInTheDocument();
    expect(screen.queryByText('Listing saved')).not.toBeInTheDocument();
  });

  it('shows the server’s refusal of a slug of the wrong form under the slug', async () => {
    const user = userEvent.setup();
    const dialog = await openEditor(user);
    const slug = dialog.getByRole('textbox', { name: 'Slug' });
    await user.clear(slug);
    await user.type(slug, 'Not A Slug');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await dialog.findByText(/^Use lower-case words joined by hyphens/)).toBeInTheDocument();
    expect(slug).toHaveAttribute('aria-invalid', 'true');
  });

  it('puts a message about a field the form does not have in the error slot', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/service-listings/:id', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'summary', message: 'No promises in the summary.' },
          { field: 'listedAt', message: 'Not editable.' },
        ]),
      ),
    );
    const dialog = await openEditor(user);
    await user.type(dialog.getByRole('textbox', { name: 'Summary' }), 'x');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await dialog.findByText('No promises in the summary.')).toBeInTheDocument();
    expect(dialog.getByRole('alert')).toHaveTextContent('listedAt: Not editable.');
  });
});

describe('the picture', () => {
  it('uploads a picture at once, shows it, and shows it in the table after the dialog closes', async () => {
    const user = userEvent.setup();
    const dialog = await openEditor(user);
    expect(dialog.queryByRole('img')).not.toBeInTheDocument();
    const requests = recordRequests();
    await user.upload(dialog.getByLabelText('Picture file'), png());
    expect(await screen.findByText('Picture saved')).toBeInTheDocument();
    const upload = requests.sent().find((request) => request.method === 'POST');
    expect(upload?.url.pathname).toBe(`/admin/service-listings/${ATT_ID}/image`);
    expect(upload?.form?.get('file')).toBeInstanceOf(Blob);
    expect(await dialog.findByRole('img', { name: `Picture of ${ATT}` })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Replace picture…' })).toBeInTheDocument();
    // The dialog stays open: the picture saves on its own.
    expect(screen.getByRole('dialog', { name: 'Edit listing' })).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    const row = await rowOf(TABLE, ATT);
    await waitFor(() => expect(row.getByRole('img', { name: `Picture of ${ATT}` })).toBeInTheDocument());
    expect((await getListing(ATT_ID)).imageUrl).not.toBeNull();
  });

  it('removes the picture and goes back to Upload', async () => {
    const user = userEvent.setup();
    const dialog = await openEditor(user);
    await user.upload(dialog.getByLabelText('Picture file'), png());
    await dialog.findByRole('img', { name: `Picture of ${ATT}` });
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Remove picture' }));
    expect(await screen.findByText('Picture removed')).toBeInTheDocument();
    expect(requests.sent().some((request) => request.method === 'DELETE')).toBe(true);
    await waitFor(() => expect(dialog.queryByRole('img')).not.toBeInTheDocument());
    expect(dialog.getByRole('button', { name: 'Upload picture…' })).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: 'Remove picture' })).not.toBeInTheDocument();
    expect((await getListing(ATT_ID)).imageUrl).toBeNull();
  });

  it('refuses a wrong type or a file over 2 MiB without sending it', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const dialog = await openEditor(user);
    const requests = recordRequests();
    await user.upload(dialog.getByLabelText('Picture file'), png('anim.gif', 'image/gif'));
    expect(await dialog.findByText('Choose a JPEG, PNG or WebP picture.')).toBeInTheDocument();
    await user.upload(
      dialog.getByLabelText('Picture file'),
      png('big.png', 'image/png', 2 * 1024 * 1024 + 1),
    );
    expect(await dialog.findByText('The picture is over 2 MiB. Choose a smaller file.')).toBeInTheDocument();
    expect(requests.sent().some((request) => request.method === 'POST')).toBe(false);
  });

  it('shows the server’s refusal of a picture under the control', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/service-listings/:id/image', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'file', message: 'The picture is too small: use at least 200 pixels on each side.' },
        ]),
      ),
    );
    const dialog = await openEditor(user);
    await user.upload(dialog.getByLabelText('Picture file'), png());
    expect(
      await dialog.findByText('The picture is too small: use at least 200 pixels on each side.'),
    ).toBeInTheDocument();
    expect(dialog.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('Picture saved')).not.toBeInTheDocument();
  });

  it('shows the server’s words when the picture is too large for the server (413)', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/service-listings/:id/image', () =>
        problem(413, 'PAYLOAD_TOO_LARGE', 'Picture too large', 'A picture can be at most 2 MiB.'),
      ),
    );
    const dialog = await openEditor(user);
    await user.upload(dialog.getByLabelText('Picture file'), png());
    expect(await dialog.findByText('A picture can be at most 2 MiB.')).toBeInTheDocument();
  });
});

describe('the table', () => {
  it('shows when a listing first went on the site under its switch', async () => {
    await openCatalogView('/catalog');
    expect((await rowOf(TABLE, ATT)).getByText(/^Listed \d{2} \w{3}, \d{2}:\d{2}$/)).toBeInTheDocument();
  });
});
