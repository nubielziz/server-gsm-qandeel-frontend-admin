// Tests for the logos on the Payment methods tab (feature 32, backend B232), run through the whole app against the dev mock API with the folder
// of bundled logos stubbed: the logo beside each method's name (uploaded, bundled, icon), the gallery's logos, and the Logo field of the edit dialog
// (upload, replace, remove, the client check, the server's refusal under it).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { createGateway, getGateway, uploadGatewayLogo } from '../api';
import { logoForm } from '../lib/paymentLogos';
import { dialogOf, openSettings } from '../test/settingsPage';
import { recordRequests } from '../test/requests';
import type * as Logos from '../lib/paymentLogos';

// The bundled folder as this file sees it: a Vodafone Cash and a Binance Pay file, nothing else.
vi.mock('../lib/paymentLogos', async (importOriginal) => {
  const real = await importOriginal<typeof Logos>();
  const files = { vodafone_cash: '/assets/vodafone_cash.png', binance_pay: '/assets/binance_pay.png' };
  return { ...real, bundledLogo: (preset: string | null | undefined) => real.bundledLogo(preset, files) };
});

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', 'http://api.test'));
afterEach(() => vi.restoreAllMocks());

const png = (name = 'logo.png', type = 'image/png', size = 3) =>
  new File([new Uint8Array(size)], name, { type });

/** A saved method's card, and the logo box inside it. */
const card = async (name: string) => within(await screen.findByRole('article', { name }));
const boxOf = (scope: HTMLElement | Element) => scope.querySelector('[data-logo-source]');
const sourceOf = async (name: string) =>
  boxOf(await screen.findByRole('article', { name }))?.getAttribute('data-logo-source');
/** The picture in a saved method's card or in an open dialog. The name is printed next to it, so the picture has an empty alternative text. */
const pictureOf = async (name: string) => (await screen.findByRole('article', { name })).querySelector('img');
const dialogPicture = (name: string) => screen.getByRole('dialog', { name }).querySelector('img');
const iconOf = async (name: string) =>
  boxOf(await screen.findByRole('article', { name }))?.getAttribute('data-logo-icon');

/** A Vodafone Cash method made the way the dialog sends it. */
const addVodafone = () =>
  createGateway({
    code: 'vodafone_cash',
    driver: 'vodafone_cash',
    name: 'Vodafone Cash',
    audience: 'both',
    feePercent: '0',
    feeFixed: '0',
    minAmount: '0',
    maxAmount: '0',
    allowedGroupIds: [],
    supportsRefunds: false,
    supports3ds: false,
    isManual: true,
    instructions: 'Send to 0100.',
    holdHours: 0,
    isActive: false,
    preset: 'vodafone_cash',
  });

describe('the logo beside each method’s name', () => {
  it('shows the bundled logo of the preset, and an icon by type for the custom methods', async () => {
    await signInAs();
    await addVodafone();
    await openSettings();
    expect(await sourceOf('Vodafone Cash')).toBe('bundled');
    expect(await pictureOf('Vodafone Cash')).toHaveAttribute('src', '/assets/vodafone_cash.png');
    // The name is printed beside the logo: the picture adds nothing for a screen reader.
    expect(await pictureOf('Vodafone Cash')).toHaveAttribute('alt', '');
    expect(await sourceOf('Card gateway')).toBe('icon');
    expect(await iconOf('Card gateway')).toBe('card');
    expect(await iconOf('Crypto gateway')).toBe('coin');
    expect(await iconOf('Bank transfer')).toBe('bank');
    expect(await iconOf('Wise')).toBe('bank');
  });

  it('shows an uploaded logo over the preset’s and over an icon', async () => {
    await signInAs();
    const vodafone = await addVodafone();
    await uploadGatewayLogo(vodafone.id, logoForm(png()));
    await uploadGatewayLogo(1, logoForm(png()));
    await openSettings();
    expect(await sourceOf('Vodafone Cash')).toBe('uploaded');
    expect(await sourceOf('Card gateway')).toBe('uploaded');
    expect(
      (await pictureOf('Card gateway'))?.getAttribute('src'),
      // The mock answers an object URL in a browser-like environment and a media path where there is none; both are used as they come.
    ).toMatch(/^blob:|^http:\/\/api\.test\/store\/v1\/media\/mock-logo-1-/);
    expect(await sourceOf('Crypto gateway')).toBe('icon');
  });

  it('draws the gallery cards the same way: a logo when the file is there, else an icon', async () => {
    await openSettings();
    const list = await screen.findByRole('region', { name: 'Ready-made methods' });
    const logoOf = (name: string) => boxOf(within(list).getByRole('listitem', { name }));
    await within(list).findByRole('listitem', { name: 'Vodafone Cash' });
    expect(logoOf('Vodafone Cash')?.getAttribute('data-logo-source')).toBe('bundled');
    expect(logoOf('Binance Pay')?.getAttribute('data-logo-source')).toBe('bundled');
    expect(logoOf('Binance Pay (automatic)')?.getAttribute('data-logo-source')).toBe('bundled');
    expect(logoOf('InstaPay')?.getAttribute('data-logo-icon')).toBe('bank');
    expect(logoOf('Fawry')?.getAttribute('data-logo-icon')).toBe('bank');
    expect(logoOf('Crypto transfer')?.getAttribute('data-logo-icon')).toBe('coin');
    expect(logoOf('NOWPayments')?.getAttribute('data-logo-icon')).toBe('coin');
    expect(logoOf('Bank transfer')?.getAttribute('data-logo-icon')).toBe('bank');
  });
});

describe('the Logo field of the edit dialog', () => {
  const openEdit = async (user: ReturnType<typeof userEvent.setup>, name = 'Card gateway') => {
    await user.click((await card(name)).getByRole('button', { name: `Edit ${name}` }));
    return dialogOf(`Edit ${name}`);
  };

  it('is not in the add dialog, only in an edit', async () => {
    const user = userEvent.setup();
    await openSettings();
    await user.click(await screen.findByRole('button', { name: 'Add custom method' }));
    expect(dialogOf('Add payment method').queryByLabelText('Logo file')).not.toBeInTheDocument();
  });

  it('uploads at once, shows the new logo, keeps the dialog open and updates the card', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openSettings();
    const dialog = await openEdit(user);
    expect(dialog.getByRole('button', { name: 'Upload logo…' })).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: 'Remove logo' })).not.toBeInTheDocument();
    await user.upload(dialog.getByLabelText('Logo file'), png());
    expect(await screen.findByText('Logo of Card gateway saved')).toBeInTheDocument();
    const upload = requests.to('POST', '/logo')[0];
    expect(upload?.url.pathname).toBe('/admin/payment-gateways/1/logo');
    expect(upload?.form?.get('file')).toBeInstanceOf(Blob);
    await waitFor(() => expect(dialogPicture('Edit Card gateway')).not.toBeNull());
    expect(dialogPicture('Edit Card gateway')).toHaveAttribute('alt', '');
    expect(dialog.getByRole('button', { name: 'Replace logo…' })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Remove logo' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edit Card gateway' })).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(async () => expect(await sourceOf('Card gateway')).toBe('uploaded'));
    expect((await getGateway(1)).logoUrl).not.toBeNull();
  });

  it('removes the uploaded logo and goes back to the preset’s logo or the icon', async () => {
    const user = userEvent.setup();
    await signInAs();
    const vodafone = await addVodafone();
    await uploadGatewayLogo(vodafone.id, logoForm(png()));
    await openSettings();
    const dialog = await openEdit(user, 'Vodafone Cash');
    expect(dialog.getByText(/shows the logo of its ready-made method/)).toBeInTheDocument();
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Remove logo' }));
    expect(await screen.findByText('Logo of Vodafone Cash removed')).toBeInTheDocument();
    expect(requests.sent().some((request) => request.method === 'DELETE')).toBe(true);
    expect(await dialog.findByRole('button', { name: 'Upload logo…' })).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: 'Remove logo' })).not.toBeInTheDocument();
    expect((await getGateway(vodafone.id)).logoUrl).toBeNull();
    // The preview falls back to the bundled logo of the preset.
    await waitFor(() =>
      expect(dialogPicture('Edit Vodafone Cash')).toHaveAttribute('src', '/assets/vodafone_cash.png'),
    );
  });

  it('refuses a wrong type or a file over 2 MiB without sending it', async () => {
    const user = userEvent.setup({ applyAccept: false });
    await openSettings();
    const dialog = await openEdit(user);
    const requests = recordRequests();
    await user.upload(dialog.getByLabelText('Logo file'), png('a.gif', 'image/gif'));
    expect(await dialog.findByText('Choose a JPEG, PNG or WebP picture.')).toBeInTheDocument();
    await user.upload(dialog.getByLabelText('Logo file'), png('big.png', 'image/png', 2 * 1024 * 1024 + 1));
    expect(await dialog.findByText('The logo is over 2 MiB. Choose a smaller file.')).toBeInTheDocument();
    expect(requests.sent().some((request) => request.method === 'POST')).toBe(false);
  });

  it('shows the server’s refusal under the control and keeps the logo as it was', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/payment-gateways/:id/logo', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'file', message: 'The picture is too small: use at least 64 pixels on each side.' },
        ]),
      ),
    );
    await openSettings();
    const dialog = await openEdit(user);
    await user.upload(dialog.getByLabelText('Logo file'), png());
    expect(
      await dialog.findByText('The picture is too small: use at least 64 pixels on each side.'),
    ).toBeInTheDocument();
    expect(dialogPicture('Edit Card gateway')).toBeNull();
    expect(screen.queryByText('Logo of Card gateway saved')).not.toBeInTheDocument();
  });

  it('shows the server’s words when the logo is too large for it (413)', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/payment-gateways/:id/logo', () =>
        problem(413, 'PAYLOAD_TOO_LARGE', 'Logo too large', 'A logo can be at most 2 MiB.'),
      ),
    );
    await openSettings();
    const dialog = await openEdit(user);
    await user.upload(dialog.getByLabelText('Logo file'), png());
    expect(await dialog.findByText('A logo can be at most 2 MiB.')).toBeInTheDocument();
  });

  it('shows the server’s refusal of a removal under the control', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.delete('*/admin/payment-gateways/:id/logo', () =>
        problem(404, 'NOT_FOUND', 'Not found', 'No payment gateway with id 1.'),
      ),
    );
    await signInAs();
    await uploadGatewayLogo(1, logoForm(png()));
    await openSettings();
    const dialog = await openEdit(user);
    await user.click(await dialog.findByRole('button', { name: 'Remove logo' }));
    expect(await dialog.findByText('No payment gateway with id 1.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Remove logo' })).toBeInTheDocument();
  });
});
