// Tests for the edit view of one service, run through the whole app against the dev mock API: the host (its menu of parts, the part the
// address names, the states for a missing, unknown or unreadable service, the kind on the strip), the Overview part (its rows, its save,
// the server's refusals, its locks), the question asked before unsaved changes are left, and the Activity part (its links and the delete).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { renderApp, setupMockApi, signInAs } from '@/test/renderApp';
import { createService, getService, importInventoryCodes, updateService } from '../../../api';
import { groupHandlers } from '../../../mocks/testGroups';
import { currentLink, kindStrip, openProducts, viewLinks } from '../../../test/productsPage';
import { recordRequests } from '../../../test/requests';
import { EMPTY_ADDRESS } from '../all/allAddress';
import { rememberAllAddress } from '../all/lastAllAddress';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
// The accounts feature serves the rank list; these tests bring their own copy of it.
beforeEach(() => mockServer.use(...groupHandlers));
afterEach(() => vi.restoreAllMocks());

const CHIMERA = 17; // a Server service: SRV-CHM-1M, "Chimera Tool 1 Month"
const EE_UK = 9; // an IMEI service: IMEI-EE-UK, "EE UK Unlock", in "Carrier unlock", one day, automatic, on
const Z3X = 15; // a Server service with 38 orders
const EE_ROUTE = `/products?view=edit&type=imei&id=${EE_UK}`;
// The parts of a service that is not delivered from code stock (no Inventory), and of one that is.
const ALL_PARTS = ['Overview', 'Set Pricing', 'Field', 'API Connection', 'Retail Purchase', 'Activity'];
const STOCK_PARTS = [
  'Overview',
  'Set Pricing',
  'Field',
  'API Connection',
  'Retail Purchase',
  'Inventory',
  'Activity',
];

const parts = () => within(screen.getByRole('navigation', { name: 'Parts' }));
const partTexts = () =>
  parts()
    .getAllByRole('link')
    .map((link) => link.textContent);
const currentPart = () =>
  parts()
    .getAllByRole('link')
    .find((link) => link.getAttribute('aria-current') === 'page')?.textContent;

const textbox = (name: string) => screen.getByRole('textbox', { name });
const saveButton = () => screen.getByRole('button', { name: 'Save' });
const overviewHeading = () =>
  screen.findByRole('heading', { level: 3, name: 'Overview' }, { timeout: 10_000 });

/** Opens the Overview of EE UK Unlock (or another address) and waits for the part. */
async function openOverview(route = EE_ROUTE, options: { permissions?: string[] } = {}) {
  const app = await openProducts(route, options);
  await overviewHeading();
  return app;
}

/** The PATCH requests sent so far. */
const patches = (requests: ReturnType<typeof recordRequests>) =>
  requests.sent().filter((request) => request.method === 'PATCH');

describe('the host', () => {
  it('shows the service with a menu of its parts and the first part', async () => {
    await openProducts(`/products?view=edit&type=server&id=${CHIMERA}`);
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Chimera Tool 1 Month' }),
    ).toBeInTheDocument();
    expect(screen.getByText('#17 · SRV-CHM-1M')).toBeInTheDocument();
    expect(partTexts()).toEqual(ALL_PARTS);
    expect(currentPart()).toBe('Overview');
    expect(await overviewHeading()).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to All' })).toHaveAttribute(
      'href',
      '/products?view=all&type=server',
    );
  });

  it('shows the Inventory part only for a service delivered from code stock', async () => {
    await openProducts(`/products?view=edit&type=server&id=${Z3X}`);
    expect(await overviewHeading()).toBeInTheDocument();
    expect(partTexts()).toEqual(STOCK_PARTS);
    expect(parts().getByRole('link', { name: 'Inventory' })).toHaveAttribute(
      'href',
      `/products?view=edit&type=server&id=${Z3X}&part=inventory`,
    );
  });

  it('opens the first part when the address names the Inventory part for a service that holds no codes', async () => {
    await openProducts(`/products?view=edit&type=server&id=${CHIMERA}&part=inventory`);
    expect(await overviewHeading()).toBeInTheDocument();
    expect(currentPart()).toBe('Overview');
    expect(partTexts()).not.toContain('Inventory');
    expect(screen.queryByRole('heading', { level: 3, name: 'Stored codes' })).not.toBeInTheDocument();
  });

  it('shows the part the address names, and links each part with the service in the address', async () => {
    await openProducts(`/products?view=edit&type=server&id=${CHIMERA}&part=activity`);
    expect(await screen.findByRole('heading', { level: 3, name: 'Activity' })).toBeInTheDocument();
    expect(currentPart()).toBe('Activity');
    expect(parts().getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      `/products?view=edit&type=server&id=${CHIMERA}&part=overview`,
    );
  });

  it('shows the kind of the service on the strip, whatever kind the address names', async () => {
    const app = await openProducts(`/products?view=edit&id=${CHIMERA}&part=activity`);
    await waitFor(() =>
      expect(app.location()).toBe(`/products?view=edit&type=server&id=${CHIMERA}&part=activity`),
    );
    await waitFor(async () => expect(currentLink(await kindStrip())).toBe('Server Service'));
    expect(currentPart()).toBe('Activity');
  });

  it('opens the first part for a part that is not known', async () => {
    await openProducts(`/products?view=edit&type=server&id=${CHIMERA}&part=nothing`);
    expect(await overviewHeading()).toBeInTheDocument();
    expect(currentPart()).toBe('Overview');
  });

  it('leaves out the parts a role may not see, and opens the first one for a part it may not', async () => {
    await openProducts(`/products?view=edit&type=server&id=${CHIMERA}&part=shop`, {
      permissions: ['catalog:read'],
    });
    expect(await overviewHeading()).toBeInTheDocument();
    expect(partTexts()).toEqual(['Overview', 'Set Pricing', 'Field', 'API Connection', 'Activity']);
    expect(currentPart()).toBe('Overview');
  });

  it('says no service is chosen when the address names none', async () => {
    await openProducts('/products?view=edit');
    expect(await screen.findByRole('heading', { level: 3, name: 'No service chosen' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to All' })).toHaveAttribute(
      'href',
      '/products?view=all&type=imei',
    );
  });

  it('says a service that does not exist does not exist, with a link back', async () => {
    await openProducts('/products?view=edit&id=999999');
    expect(
      await screen.findByRole(
        'heading',
        { level: 3, name: 'This service does not exist' },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('There is no service #999999. It may have been deleted.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to All' })).toHaveAttribute(
      'href',
      '/products?view=all&type=imei',
    );
  });

  it('links back to the list as it was last seen (its search and page), not to the first page', async () => {
    rememberAllAddress('imei', { ...EMPTY_ADDRESS, q: 'unlock', page: 2, size: 25 });
    await openProducts(EE_ROUTE);
    expect(await screen.findByRole('link', { name: 'Back to All' })).toHaveAttribute(
      'href',
      '/products?view=all&type=imei&q=unlock&page=2&size=25',
    );
  });

  it('links back to the list as it was last seen from the states with no service, too', async () => {
    rememberAllAddress('imei', { ...EMPTY_ADDRESS, group: 3 });
    await openProducts('/products?view=edit&id=999999');
    expect(
      await screen.findByRole(
        'heading',
        { level: 3, name: 'This service does not exist' },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to All' })).toHaveAttribute(
      'href',
      '/products?view=all&type=imei&group=3',
    );
  });

  it('shows the error state, with a retry, when the service cannot be read', async () => {
    mockServer.use(
      http.get('*/admin/services/:id', () =>
        HttpResponse.json({ title: 'Service unavailable', status: 503 }, { status: 503 }),
      ),
    );
    await openProducts(`/products?view=edit&type=server&id=${CHIMERA}`);
    expect(
      await screen.findByRole(
        'heading',
        { level: 3, name: 'Could not load this service' },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('the Overview part', () => {
  it('shows the service in label-left rows: name, code, group, delivery time and the four switches', async () => {
    await openOverview();
    expect(textbox('Service Name')).toHaveValue('EE UK Unlock');
    expect(textbox('Code')).toHaveValue('IMEI-EE-UK');
    const group = screen.getByRole('combobox', { name: 'Service Listed In Group' });
    await waitFor(() => expect(group).toHaveDisplayValue('Carrier unlock'));
    expect(textbox('Delivery Time')).toHaveValue('1');
    expect(screen.getByRole('combobox', { name: 'Delivery time unit' })).toHaveDisplayValue('Days');
    expect(screen.getByRole('switch', { name: 'Status' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'Order handling' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'Send For Verification' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('switch', { name: 'User Can Cancel Order' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.queryByRole('textbox', { name: 'Verification window' })).not.toBeInTheDocument();
  });

  it('orders the rows as the +Add Service form does, with the verification window as a row of its own', async () => {
    const user = userEvent.setup();
    await openOverview();
    const labels = () =>
      [...document.querySelectorAll('.form-row-label')].map((label) => label.textContent?.replace('*', ''));
    expect(labels()).toEqual([
      'Service Name',
      'Code',
      'Service Listed In Group',
      'Status',
      'Send For Verification',
      'User Can Cancel Order',
      'Delivery Time',
      'Order handling',
      'Delivered from code stock',
    ]);
    await user.click(screen.getByRole('switch', { name: 'Send For Verification' }));
    expect(await screen.findByRole('textbox', { name: 'Verification window' })).toBeInTheDocument();
    expect(labels()).toEqual([
      'Service Name',
      'Code',
      'Service Listed In Group',
      'Status',
      'Send For Verification',
      'Verification window',
      'User Can Cancel Order',
      'Delivery Time',
      'Order handling',
      'Delivered from code stock',
    ]);
  });

  it('offers only the groups of the service’s own kind', async () => {
    await openOverview();
    const group = screen.getByRole('combobox', { name: 'Service Listed In Group' });
    await within(group).findByRole('option', { name: 'Samsung' });
    const names = within(group)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(names).toEqual(expect.arrayContaining(['Apple', 'Carrier unlock', 'Samsung']));
    expect(names).not.toContain('Credits');
  });

  it('keeps Save off until something changes, and off again when the change is undone', async () => {
    const user = userEvent.setup();
    await openOverview();
    expect(saveButton()).toBeDisabled();
    await user.type(textbox('Service Name'), ' X');
    expect(saveButton()).toBeEnabled();
    await user.type(textbox('Service Name'), '{Backspace}{Backspace}');
    expect(saveButton()).toBeDisabled();
  });

  it('saves only what changed, tells so, and is clean again', async () => {
    const user = userEvent.setup();
    await openOverview();
    const requests = recordRequests();
    await user.click(screen.getByRole('switch', { name: 'Status' }));
    await user.clear(textbox('Delivery Time'));
    await user.type(textbox('Delivery Time'), '2');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Delivery time unit' }), 'Hours');
    await user.click(saveButton());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    const [sent, ...others] = patches(requests);
    expect(others).toHaveLength(0);
    expect(sent.url.pathname).toMatch(/\/admin\/services\/9$/);
    expect(sent.body).toEqual({ status: 'disabled', slaMinutes: 120 });
    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Status' })).toHaveAttribute('aria-checked', 'false');
    const saved = await getService(EE_UK);
    expect(saved.status).toBe('disabled');
    expect(saved.slaMinutes).toBe(120);
  });

  it('is not drawn again after its own save, though the record is read again: the box stays and "Saved" stays', async () => {
    const user = userEvent.setup();
    await openOverview();
    const requests = recordRequests();
    const reads = () =>
      requests
        .sent()
        .filter((request) => request.method === 'GET' && /\/admin\/services\/9$/.test(request.url.pathname));
    const box = textbox('Service Name');
    await user.type(box, ' X');
    await user.click(saveButton());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(reads().length).toBeGreaterThan(0);
    expect(textbox('Service Name')).toBe(box);
    expect(box).toHaveValue('EE UK Unlock X');
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('moves the service to another group of its kind', async () => {
    const user = userEvent.setup();
    await openOverview();
    const group = screen.getByRole('combobox', { name: 'Service Listed In Group' });
    await within(group).findByRole('option', { name: 'Samsung' });
    const requests = recordRequests();
    await user.selectOptions(group, 'Samsung');
    await user.click(saveButton());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    const [sent] = patches(requests);
    expect(Object.keys(sent.body as object)).toEqual(['categoryId']);
    expect((await getService(EE_UK)).category?.name).toBe('Samsung');
  });

  it('switches verification on with its window, and the cancel and order handling switches', async () => {
    const user = userEvent.setup();
    await openOverview();
    const requests = recordRequests();
    await user.click(screen.getByRole('switch', { name: 'Send For Verification' }));
    const hours = await screen.findByRole('textbox', { name: 'Verification window' });
    await user.clear(hours);
    await user.type(hours, '24');
    await user.click(screen.getByRole('switch', { name: 'User Can Cancel Order' }));
    await user.click(screen.getByRole('switch', { name: 'Order handling' }));
    await user.click(saveButton());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    const [sent] = patches(requests);
    expect(sent.body).toEqual({
      allowVerify: true,
      verifyWindowH: 24,
      allowCancel: true,
      executionMode: 'manual',
    });
    const saved = await getService(EE_UK);
    expect([saved.allowVerify, saved.verifyWindowH, saved.allowCancel, saved.executionMode]).toEqual([
      true,
      24,
      true,
      'manual',
    ]);
  });

  it('shows the checks under their rows and sends nothing while a value is wrong', async () => {
    const user = userEvent.setup();
    await openOverview();
    const requests = recordRequests();
    await user.click(screen.getByRole('switch', { name: 'Send For Verification' }));
    const hours = await screen.findByRole('textbox', { name: 'Verification window' });
    await user.clear(hours);
    await user.type(hours, '800');
    await user.clear(textbox('Delivery Time'));
    await user.type(textbox('Delivery Time'), '0');
    await user.clear(textbox('Service Name'));
    await user.click(saveButton());
    expect(await screen.findByText('Enter hours, 0 to 720.')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number, 1 or more.')).toBeInTheDocument();
    expect(screen.getByText('Enter a name.')).toBeInTheDocument();
    expect(patches(requests)).toHaveLength(0);
  });

  it('shows Delivered from code stock, off for an unlock and on for a service that holds codes', async () => {
    await openOverview();
    const stock = screen.getByRole('switch', { name: 'Delivered from code stock' });
    expect(stock).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByText(
        "Orders take a code from this service's stock first. For gift cards and other codes; leave No for unlocks.",
      ),
    ).toBeInTheDocument();
  });

  it('shows the switch on for a service that holds codes', async () => {
    await openOverview(`/products?view=edit&type=server&id=${Z3X}`);
    expect(screen.getByRole('switch', { name: 'Delivered from code stock' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('saves Delivered from code stock with the part, and the Inventory part appears', async () => {
    const user = userEvent.setup();
    await openOverview();
    expect(partTexts()).not.toContain('Inventory');
    const requests = recordRequests();
    await user.click(screen.getByRole('switch', { name: 'Delivered from code stock' }));
    await user.click(saveButton());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    const [sent, ...others] = patches(requests);
    expect(others).toHaveLength(0);
    expect(sent.body).toEqual({ stockDelivery: true });
    expect((await getService(EE_UK)).stockDelivery).toBe(true);
    await waitFor(() => expect(partTexts()).toContain('Inventory'));
  });

  it('refuses to turn it off while codes are in stock, under the switch, and keeps the change', async () => {
    const user = userEvent.setup();
    await openOverview(`/products?view=edit&type=server&id=${Z3X}`);
    const stock = screen.getByRole('switch', { name: 'Delivered from code stock' });
    await user.click(stock);
    expect(stock).toHaveAttribute('aria-checked', 'false');
    await user.click(saveButton());
    expect(await screen.findByText('Void the 13 codes in stock first.')).toBeInTheDocument();
    expect(stock).toHaveAttribute('aria-checked', 'false');
    expect(saveButton()).toBeEnabled();
    expect(screen.queryByText(/stockDelivery/)).not.toBeInTheDocument();
    const saved = await getService(Z3X);
    expect([saved.stockDelivery, saved.stockAvailable]).toEqual([true, 13]);
  });

  it('says "1 code", not "1 codes", when one code is in stock', async () => {
    const user = userEvent.setup();
    await signInAs();
    await updateService(EE_UK, { stockDelivery: true });
    await importInventoryCodes(EE_UK, { codes: ['EE-0001-AAAA'] });
    await openOverview();
    await user.click(screen.getByRole('switch', { name: 'Delivered from code stock' }));
    await user.click(saveButton());
    expect(await screen.findByText('Void the 1 code in stock first.')).toBeInTheDocument();
    expect(screen.queryByText(/1 codes/)).not.toBeInTheDocument();
  });

  it('puts the server’s refusal under the row it names and keeps the changes', async () => {
    const user = userEvent.setup();
    await openOverview();
    await user.clear(textbox('Code'));
    await user.type(textbox('Code'), 'IMEI-TMO-USA');
    await user.click(saveButton());
    expect(
      await screen.findByText('The code IMEI-TMO-USA is already used by T-Mobile USA Unlock.'),
    ).toBeInTheDocument();
    expect(textbox('Code')).toHaveValue('IMEI-TMO-USA');
    expect(saveButton()).toBeEnabled();
    expect((await getService(EE_UK)).code).toBe('IMEI-EE-UK');
  });

  it('keeps every control off, and says why beside Save, for a role that may not change services', async () => {
    await openOverview(EE_ROUTE, { permissions: ['catalog:read'] });
    expect(textbox('Service Name')).toBeDisabled();
    expect(textbox('Code')).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Status' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'User Can Cancel Order' })).toBeDisabled();
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText('You need the catalog:update permission')).toBeInTheDocument();
  });
});

describe('the question before unsaved changes are left', () => {
  const question = () => screen.findByRole('dialog', { name: 'Discard your unsaved changes?' });

  it('asks before another part is opened, keeps the typing on "Keep editing" and drops it on "Discard changes"', async () => {
    const user = userEvent.setup();
    const app = await openOverview();
    await user.type(textbox('Service Name'), ' X');
    await user.click(parts().getByRole('link', { name: 'Set Pricing' }));
    const dialog = within(await question());
    expect(
      dialog.getByText('You have unsaved changes in Overview. If you go on, they are lost.'),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Keep editing' }));
    expect(app.location()).toBe(EE_ROUTE);
    expect(textbox('Service Name')).toHaveValue('EE UK Unlock X');

    await user.click(parts().getByRole('link', { name: 'Set Pricing' }));
    await user.click(within(await question()).getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(app.location()).toBe(`${EE_ROUTE}&part=pricing`));
    expect(currentPart()).toBe('Set Pricing');

    await user.click(parts().getByRole('link', { name: 'Overview' }));
    expect(await overviewHeading()).toBeInTheDocument();
    expect(textbox('Service Name')).toHaveValue('EE UK Unlock');
  });

  it('does not ask when nothing is unsaved', async () => {
    const user = userEvent.setup();
    const app = await openOverview();
    await user.click(parts().getByRole('link', { name: 'Activity' }));
    await waitFor(() => expect(app.location()).toBe(`${EE_ROUTE}&part=activity`));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not ask for the link to the part that is open, though the address names no part', async () => {
    const user = userEvent.setup();
    await openOverview();
    await user.type(textbox('Service Name'), ' X');
    await user.click(parts().getByRole('link', { name: 'Overview' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(textbox('Service Name')).toHaveValue('EE UK Unlock X');
  });

  it('asks before the link back to All is followed', async () => {
    const user = userEvent.setup();
    const app = await openOverview();
    await user.type(textbox('Code'), '-2');
    await user.click(screen.getByRole('link', { name: 'Back to All' }));
    await user.click(within(await question()).getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(app.location()).toBe('/products?view=all&type=imei'));
  });

  it('asks before another view of the page is opened', async () => {
    const user = userEvent.setup();
    const app = await openOverview();
    await user.type(textbox('Service Name'), ' X');
    await user.click((await viewLinks()).getByRole('link', { name: 'Group' }));
    const dialog = within(await question());
    expect(app.location()).toBe(EE_ROUTE);
    await user.click(dialog.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(app.location()).toBe('/products?view=groups&type=imei'));
  });

  it('does not ask after the changes were saved', async () => {
    const user = userEvent.setup();
    const app = await openOverview();
    await user.type(textbox('Service Name'), ' X');
    await user.click(saveButton());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    await user.click(parts().getByRole('link', { name: 'Activity' }));
    await waitFor(() => expect(app.location()).toBe(`${EE_ROUTE}&part=activity`));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks the browser before a reload while something is unsaved, and not otherwise', async () => {
    const user = userEvent.setup();
    await openOverview();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    await user.type(textbox('Service Name'), ' X');
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});

describe('the Activity part', () => {
  const ACTIVITY = `${EE_ROUTE}&part=activity`;

  it('links to the orders of the service and to its price check', async () => {
    await openProducts(ACTIVITY);
    expect(await screen.findByRole('heading', { level: 3, name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the orders of this service' })).toHaveAttribute(
      'href',
      '/orders?tab=all&q=EE+UK+Unlock',
    );
    expect(screen.getByRole('link', { name: 'Check the price of this service' })).toHaveAttribute(
      'href',
      '/products?view=rules&type=imei&tab=check&service=9',
    );
  });

  it('says what permission is missing instead of linking, and keeps Delete off', async () => {
    await openProducts(ACTIVITY, { permissions: ['catalog:read'] });
    expect(await screen.findByRole('heading', { level: 3, name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByText('You need the orders:read permission to see its orders.')).toBeInTheDocument();
    expect(screen.getByText('You need the pricing:read permission to check its price.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open the orders of this service' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete service…' })).toBeDisabled();
    expect(screen.getByText('You need the catalog:delete permission')).toBeInTheDocument();
  });

  it('deletes a service nobody ordered after the question, and goes back to the list', async () => {
    const user = userEvent.setup();
    await signInAs();
    const made = await createService({
      name: 'Temporary Check',
      code: 'TMP-EDIT-1',
      categoryId: 1,
      type: 'imei',
      slaMinutes: 5,
      basePrice: '1.0000',
    });
    const app = renderApp(`/products?view=edit&type=imei&id=${made.id}&part=activity`);
    await user.click(await screen.findByRole('button', { name: 'Delete service…' }, { timeout: 10_000 }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete Temporary Check?' }));
    await user.click(dialog.getByRole('button', { name: 'Delete service' }));
    expect(await screen.findByText('Temporary Check deleted')).toBeInTheDocument();
    await waitFor(() => expect(app.location()).toBe('/products?view=all&type=imei'));
    await expect(getService(made.id)).rejects.toMatchObject({ status: 404 });
  });

  it('shows the server’s refusal for a service that has orders and keeps the service and the view', async () => {
    const user = userEvent.setup();
    const app = await openProducts(`/products?view=edit&type=server&id=${Z3X}&part=activity`);
    await user.click(await screen.findByRole('button', { name: 'Delete service…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete Z3X Credits x10?' }));
    await user.click(dialog.getByRole('button', { name: 'Delete service' }));
    expect(
      await dialog.findByText('Z3X Credits x10 has 38 orders, so it cannot be deleted. Disable it instead.'),
    ).toBeInTheDocument();
    expect(app.location()).toBe(`/products?view=edit&type=server&id=${Z3X}&part=activity`);
    expect((await getService(Z3X)).name).toBe('Z3X Credits x10');
  });
});
