// Tests for the +Add Service view, run through the whole app against the dev mock API: the rows in the layout's order, one service made by hand
// (the create call, and the update after it for an Inactive or Manual one), the checks, the server's refusals under their fields, the settings a
// chosen service copies in, the locks, and the shell's "Add services from a supplier" checkbox (a probe in place of the supplier form, and the
// suppliers feature's own form through the page).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { listServices } from '../../../api';
import { grantsOf } from '../../../test/grants';
import { openProducts } from '../../../test/productsPage';
import { recordRequests, type SentRequest } from '../../../test/requests';
import { AddView } from './AddView';
import type { SupplierFormProps } from './types';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const ADD = '/products?view=add';
const SERVER_ADD = '/products?view=add&type=server';

/** Opens the view and waits until its menus hold their names (the groups of the kind and the services to copy from). */
async function openForm(route = ADD) {
  const app = await openProducts(route);
  await screen.findByRole('textbox', { name: 'Service Name' }, { timeout: 10_000 });
  await screen.findByRole('option', { name: 'Apple' });
  return { app, user: userEvent.setup() };
}

const box = (name: string) => screen.getByRole('textbox', { name });
const menu = (name: string) => screen.getByRole('combobox', { name });
const toggle = (name: string) => screen.getByRole('switch', { name });
const addButton = () => screen.getByRole('button', { name: 'Add' });

type User = ReturnType<typeof userEvent.setup>;

/** Types the boxes a service needs (the group, the delivery time and the credit). */
async function fill(user: User, values: { name: string; code: string; hours?: string; credit?: string }) {
  await user.type(box('Service Name'), values.name);
  await user.type(box('Code'), values.code);
  await user.selectOptions(menu('Service Listed In Group'), 'Apple');
  await user.type(box('Delivery Time'), values.hours ?? '2');
  await user.selectOptions(menu('Delivery time unit'), 'Hours');
  await user.type(box('Credit'), values.credit ?? '3.5');
}

/** The calls of a kind the client sent to `/admin/services` (the list) or to one service of it. */
const calls = (sent: SentRequest[], method: string) =>
  sent.filter(
    (request) => request.method === method && /\/admin\/services(\/\d+)?$/.test(request.url.pathname),
  );

describe('the form', () => {
  it('has a heading, the supplier checkbox, and the rows in the order of the layout', async () => {
    await openForm();
    expect(screen.getByRole('heading', { level: 2, name: 'Add Service' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Add services from a supplier' })).not.toBeChecked();
    const labels = [...document.querySelectorAll('.form-row-label')].map((label) =>
      label.textContent?.replace('*', ''),
    );
    expect(labels).toEqual([
      'Service Name',
      'Code',
      'Service Listed In Group',
      'Status',
      'Send For Verification',
      'User Can Cancel Order',
      'Delivery Time',
      'Credit',
      'Order handling',
    ]);
    expect(addButton()).toBeEnabled();
  });

  it('starts as the server starts a service, with the window row hidden', async () => {
    await openForm();
    expect(toggle('Status')).toHaveAttribute('aria-checked', 'true');
    expect(toggle('Send For Verification')).toHaveAttribute('aria-checked', 'false');
    expect(toggle('User Can Cancel Order')).toHaveAttribute('aria-checked', 'false');
    expect(toggle('Order handling')).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('textbox', { name: 'Verification window' })).not.toBeInTheDocument();
    expect(menu('Delivery time unit')).toHaveDisplayValue('Minutes');
  });

  it('names the switches in the words of the layout', async () => {
    await openForm();
    expect(within(toggle('Status')).getByText('Active')).toBeInTheDocument();
    expect(within(toggle('Status')).getByText('Inactive')).toBeInTheDocument();
    expect(within(toggle('Order handling')).getByText('Automatic')).toBeInTheDocument();
    expect(within(toggle('Order handling')).getByText('Manual')).toBeInTheDocument();
    expect(screen.queryByText(/Assign This Service To User|Telegram/)).not.toBeInTheDocument();
  });

  it('offers only the groups of the kind on the strip, and links "Add New Group" with the kind', async () => {
    await openForm(SERVER_ADD);
    const group = menu('Service Listed In Group');
    await within(group).findByRole('option', { name: 'Credits' });
    const names = within(group)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(names).toEqual(['Choose a group', 'Credits', 'Licenses']);
    // The link says it was opened from here, so +Add Group can come back.
    expect(screen.getByRole('link', { name: 'Add New Group' })).toHaveAttribute(
      'href',
      '/products?view=add-group&type=server&return=add',
    );
  });

  it('draws the heading and the checkbox inside the form frame, so its bar ends at the foot of the window', async () => {
    await openForm();
    const frame = screen.getByRole('heading', { level: 2, name: 'Add Service' }).closest('form');
    if (!frame) throw new Error('The heading is not inside a form.');
    expect(frame).toHaveClass('view-frame');
    expect(within(frame).getByRole('checkbox', { name: 'Add services from a supplier' })).toBeInTheDocument();
    expect(within(frame).getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});

describe('adding a service', () => {
  it('creates it in one call, then opens its edit view', async () => {
    const { app, user } = await openForm();
    await fill(user, { name: 'Pixel Check', code: 'IMEI-PX-1' });
    const requests = recordRequests();
    await user.click(addButton());

    expect(await screen.findByRole('heading', { level: 2, name: 'Pixel Check' })).toBeInTheDocument();
    await waitFor(() => expect(app.location()).toMatch(/^\/products\?view=edit&type=imei&id=\d+$/));
    const sent = requests.sent();
    const created = calls(sent, 'POST');
    expect(created).toHaveLength(1);
    expect(created[0].body).toEqual({
      name: 'Pixel Check',
      code: 'IMEI-PX-1',
      categoryId: 1,
      type: 'imei',
      slaMinutes: 120,
      basePrice: '3.5000',
    });
    // An Active, Automatic service needs no second call.
    expect(calls(sent, 'PATCH')).toHaveLength(0);
    const [made] = (await listServices({ q: 'IMEI-PX-1' })).data;
    expect(made).toMatchObject({
      name: 'Pixel Check',
      type: 'imei',
      status: 'active',
      executionMode: 'auto',
      slaMinutes: 120,
      allowCancel: false,
      allowVerify: false,
    });
    expect(made.category?.name).toBe('Apple');
    expect(app.location()).toContain(`id=${made.id}`);
  });

  it('adds a service of the kind on the strip', async () => {
    const { user } = await openForm(SERVER_ADD);
    await user.type(box('Service Name'), 'Credits x5');
    await user.type(box('Code'), 'SRV-CR-5');
    await user.selectOptions(menu('Service Listed In Group'), 'Credits');
    await user.type(box('Delivery Time'), '5');
    await user.type(box('Credit'), '2');
    await user.click(addButton());
    expect(await screen.findByRole('heading', { level: 2, name: 'Credits x5' })).toBeInTheDocument();
    const [made] = (await listServices({ q: 'SRV-CR-5' })).data;
    expect(made).toMatchObject({ type: 'server', slaMinutes: 5 });
    expect(made.category?.name).toBe('Credits');
  });

  it('sends Inactive and Manual in one update after the create, and the cancel and verification keys with it', async () => {
    const { user } = await openForm();
    await fill(user, { name: 'Pixel Slow', code: 'IMEI-PX-2' });
    await user.click(toggle('Status'));
    await user.click(toggle('Order handling'));
    await user.click(toggle('User Can Cancel Order'));
    await user.click(toggle('Send For Verification'));
    const hours = await screen.findByRole('textbox', { name: 'Verification window' });
    expect(hours).toHaveValue('24');
    await user.clear(hours);
    await user.type(hours, '48');
    const requests = recordRequests();
    await user.click(addButton());

    expect(await screen.findByRole('heading', { level: 2, name: 'Pixel Slow' })).toBeInTheDocument();
    const sent = requests.sent();
    expect(calls(sent, 'POST')[0].body).toMatchObject({
      allowCancel: true,
      allowVerify: true,
      verifyWindowH: 48,
    });
    const [made] = (await listServices({ q: 'IMEI-PX-2' })).data;
    const changed = calls(sent, 'PATCH');
    expect(changed).toHaveLength(1);
    expect(changed[0].url.pathname.endsWith(`/admin/services/${made.id}`)).toBe(true);
    expect(changed[0].body).toEqual({ status: 'disabled', executionMode: 'manual' });
    expect(made).toMatchObject({
      status: 'disabled',
      executionMode: 'manual',
      allowCancel: true,
      allowVerify: true,
      verifyWindowH: 48,
    });
  });

  it('says the service exists and opens its edit view when the update after the create is refused', async () => {
    mockServer.use(
      http.patch('*/admin/services/:id', () =>
        problem(403, 'FORBIDDEN', 'No access', 'You need the pricing:update permission.'),
      ),
    );
    const { app, user } = await openForm();
    await fill(user, { name: 'Pixel Half', code: 'IMEI-PX-3' });
    await user.click(toggle('Status'));
    await user.click(addButton());

    expect(await screen.findByText('Pixel Half was added, but its status was not saved')).toBeInTheDocument();
    expect(
      screen.getByText('You need the pricing:update permission. Set it in the editor.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Pixel Half' })).toBeInTheDocument();
    expect(app.location()).toMatch(/^\/products\?view=edit&type=imei&id=\d+$/);
    const [made] = (await listServices({ q: 'IMEI-PX-3' })).data;
    expect(made.status).toBe('active');
  });
});

describe("the checks and the server's refusals", () => {
  it('asks for what is missing before it calls the server', async () => {
    const { user } = await openForm();
    const requests = recordRequests();
    await user.click(addButton());
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a code.')).toBeInTheDocument();
    expect(screen.getByText('Choose a group.')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number, 1 or more.')).toBeInTheDocument();
    expect(screen.getByText('Enter a credit greater than zero.')).toBeInTheDocument();
    expect(box('Service Name')).toHaveAttribute('aria-invalid', 'true');
    expect(box('Credit')).toHaveAttribute('aria-invalid', 'true');
    expect(calls(requests.sent(), 'POST')).toHaveLength(0);
  });

  it('asks for the verification window in hours, 1 to 720', async () => {
    const { user } = await openForm();
    await fill(user, { name: 'Pixel Window', code: 'IMEI-PX-4' });
    await user.click(toggle('Send For Verification'));
    const hours = await screen.findByRole('textbox', { name: 'Verification window' });
    await user.clear(hours);
    await user.type(hours, '0');
    const requests = recordRequests();
    await user.click(addButton());
    expect(await screen.findByText('Enter the hours, 1 to 720.')).toBeInTheDocument();
    expect(calls(requests.sent(), 'POST')).toHaveLength(0);
  });

  it('puts a taken code under the code box and stays on the form', async () => {
    const { app, user } = await openForm();
    await fill(user, { name: 'Copycat', code: 'IMEI-ATT-USA' });
    await user.click(addButton());
    expect(await screen.findByText(/The code IMEI-ATT-USA is already used by/)).toBeInTheDocument();
    expect(box('Code')).toHaveAttribute('aria-invalid', 'true');
    expect(app.location()).toBe(ADD);
    expect(addButton()).toBeEnabled();
  });

  it("places the server's messages on their fields and shows the rest above the bar", async () => {
    mockServer.use(
      http.post('*/admin/services', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'categoryId', message: 'The group is of another kind.' },
          { field: 'slaMinutes', message: 'Enter minutes, 1 or more.' },
          { field: 'basePrice', message: 'Enter a price greater than zero.' },
          { field: 'minQty', message: 'Bad quantity.' },
        ]),
      ),
    );
    const { user } = await openForm();
    await fill(user, { name: 'Odd', code: 'IMEI-ODD-1' });
    await user.click(addButton());
    expect(await screen.findByText('The group is of another kind.')).toBeInTheDocument();
    expect(menu('Service Listed In Group')).toHaveAttribute('aria-invalid', 'true');
    expect(box('Delivery Time')).toHaveAttribute('aria-invalid', 'true');
    expect(box('Credit')).toHaveAttribute('aria-invalid', 'true');
    // The quantity is not a box of this form, so its message is in the error slot.
    expect(screen.getByRole('alert')).toHaveTextContent('minQty: Bad quantity.');
  });
});

describe('"- Select -"', () => {
  it('copies the settings of the chosen service and keeps the typed name and code', async () => {
    const { user } = await openForm();
    await user.type(box('Service Name'), 'My Xiaomi');
    await user.type(box('Code'), 'IMEI-MY-1');
    await screen.findByRole('option', { name: 'Xiaomi Mi Account Clean' });
    await user.selectOptions(menu('Copy settings from'), 'Xiaomi Mi Account Clean');

    expect(menu('Service Listed In Group')).toHaveDisplayValue('Xiaomi');
    expect(toggle('Status')).toHaveAttribute('aria-checked', 'false');
    expect(toggle('Order handling')).toHaveAttribute('aria-checked', 'true');
    expect(box('Delivery Time')).toHaveValue('3');
    expect(menu('Delivery time unit')).toHaveDisplayValue('Hours');
    expect(box('Credit')).toHaveValue('5.88');
    expect(box('Service Name')).toHaveValue('My Xiaomi');
    expect(box('Code')).toHaveValue('IMEI-MY-1');
  });

  it('copies a manual service in days, and can be changed after', async () => {
    const { user } = await openForm();
    await screen.findByRole('option', { name: 'MDM Removal, iPhone Premium' });
    await user.selectOptions(menu('Copy settings from'), 'MDM Removal, iPhone Premium');
    expect(toggle('Order handling')).toHaveAttribute('aria-checked', 'false');
    expect(box('Delivery Time')).toHaveValue('3');
    expect(menu('Delivery time unit')).toHaveDisplayValue('Days');
    expect(box('Credit')).toHaveValue('30.00');
    await user.click(toggle('Order handling'));
    expect(toggle('Order handling')).toHaveAttribute('aria-checked', 'true');
  });

  it('does not copy Status or Order handling into a role that cannot send them, and says so', async () => {
    const user = userEvent.setup();
    await openProducts(ADD, { permissions: ['catalog:read', 'catalog:create'] });
    await screen.findByRole('textbox', { name: 'Service Name' }, { timeout: 10_000 });
    await screen.findByRole('option', { name: 'Xiaomi Mi Account Clean' });
    expect(
      screen.getByText(/Status and Order handling are not copied: they need the catalog:update permission\./),
    ).toBeInTheDocument();
    await user.selectOptions(menu('Copy settings from'), 'Xiaomi Mi Account Clean');

    // The create route starts a service Active and Automatic and the update that follows needs catalog:update, so the form keeps showing that.
    expect(toggle('Status')).toHaveAttribute('aria-checked', 'true');
    expect(toggle('Order handling')).toHaveAttribute('aria-checked', 'true');
    // Everything the role can send is still copied.
    expect(menu('Service Listed In Group')).toHaveDisplayValue('Xiaomi');
    expect(box('Delivery Time')).toHaveValue('3');
    expect(box('Credit')).toHaveValue('5.88');
  });

  it('says nothing about the locks to a role that can send them', async () => {
    await openForm();
    expect(screen.queryByText(/are not copied/)).not.toBeInTheDocument();
  });

  it('lists the services of the kind on the strip only', async () => {
    await openForm(SERVER_ADD);
    await screen.findByRole('option', { name: 'Z3X Credits x10' });
    const names = within(menu('Copy settings from'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(names).toContain('UnlockTool 1-Day License');
    expect(names).not.toContain('AT&T USA Premier Unlock');
    expect(names[0]).toBe('- Select -');
  });
});

describe('the locks', () => {
  it('locks Status and Order handling without catalog:update, with the permission named', async () => {
    await openProducts(ADD, { permissions: ['catalog:read', 'catalog:create'] });
    await screen.findByRole('textbox', { name: 'Service Name' }, { timeout: 10_000 });
    for (const name of ['Status', 'Order handling']) {
      expect(toggle(name)).toBeDisabled();
      expect(toggle(name)).toHaveAttribute('title', 'You need the catalog:update permission');
    }
    expect(toggle('Send For Verification')).toBeEnabled();
    expect(addButton()).toBeEnabled();
  });
});

/** The supplier form, as a probe: it shows what it was given and finishes with the ids it is told. */
function ProbeForm({ type, initial, header, onDone }: SupplierFormProps) {
  return (
    <form aria-label="Supplier form probe" className="view-frame">
      {header}
      <p>Probe kind {type}</p>
      <p>Probe initial {JSON.stringify(initial)}</p>
      <button type="button" onClick={() => onDone([4, 5])}>
        Finish two
      </button>
      <button type="button" onClick={() => onDone([7])}>
        Finish one
      </button>
      <button type="button" onClick={() => onDone([])}>
        Finish none
      </button>
    </form>
  );
}

/** The view on its own at the page's address, so the checkbox moves the address and the same view keeps showing. */
async function openShell(search: string) {
  await signInAs();
  const app = renderShell(
    `/products${search}`,
    <Route
      path="/products"
      element={
        <AddView type="server" grants={grantsOf('catalog:read', 'catalog:create')} SupplierForm={ProbeForm} />
      }
    />,
  );
  await screen.findByRole('heading', { level: 2, name: 'Add Service' }, { timeout: 10_000 });
  return { app, user: userEvent.setup() };
}

describe('"Add services from a supplier"', () => {
  it('shows the form by hand while the box is not ticked', async () => {
    await openShell('?view=add&type=server');
    expect(screen.getByRole('checkbox', { name: 'Add services from a supplier' })).not.toBeChecked();
    expect(await screen.findByRole('textbox', { name: 'Service Name' })).toBeInTheDocument();
    expect(screen.queryByText(/Probe kind/)).not.toBeInTheDocument();
  });

  it('opens ticked, with what the address names, when it names a supplier and a way', async () => {
    await openShell('?view=add&type=server&supplier=6&from=services');
    expect(screen.getByRole('checkbox', { name: 'Add services from a supplier' })).toBeChecked();
    expect(screen.getByText('Probe kind server')).toBeInTheDocument();
    expect(screen.getByText('Probe initial {"supplierId":6,"from":"services"}')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Service Name' })).not.toBeInTheDocument();
  });

  it('opens ticked for a supplier alone, with no way chosen', async () => {
    await openShell('?view=add&type=server&supplier=6');
    expect(screen.getByText('Probe initial {"supplierId":6}')).toBeInTheDocument();
  });

  it('writes the address when it is ticked and again when it is cleared', async () => {
    const { app, user } = await openShell('?view=add&type=server');
    await user.click(screen.getByRole('checkbox', { name: 'Add services from a supplier' }));
    expect(await screen.findByText('Probe initial {"from":"groups"}')).toBeInTheDocument();
    expect(app.location()).toBe('/products?view=add&type=server&from=groups');
    expect(screen.queryByRole('textbox', { name: 'Service Name' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Add services from a supplier' }));
    expect(await screen.findByRole('textbox', { name: 'Service Name' })).toBeInTheDocument();
    expect(app.location()).toBe('/products?view=add&type=server');
    expect(screen.queryByText(/Probe kind/)).not.toBeInTheDocument();
  });

  it("shows the suppliers feature's form through the page when the box is ticked", async () => {
    await openProducts('/products?view=add&type=server&from=groups');
    expect(
      await screen.findByRole('combobox', { name: 'Supplier' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Add services from a supplier' })).toBeChecked();
    expect(screen.queryByRole('textbox', { name: 'Service Name' })).not.toBeInTheDocument();
  });

  it("hands the heading and the checkbox to the supplier form's own frame", async () => {
    await openShell('?view=add&type=server&supplier=6&from=groups');
    const frame = within(screen.getByRole('form', { name: 'Supplier form probe' }));
    expect(frame.getByRole('heading', { level: 2, name: 'Add Service' })).toBeInTheDocument();
    expect(frame.getByRole('checkbox', { name: 'Add services from a supplier' })).toBeChecked();
  });

  it('draws no result line of its own: the supplier form reports what it added', async () => {
    const { user } = await openShell('?view=add&type=server&supplier=6&from=groups');
    for (const finish of ['Finish two', 'Finish one', 'Finish none']) {
      await user.click(screen.getByRole('button', { name: finish }));
    }
    expect(screen.queryByText(/services? (was|were) added/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open the list' })).not.toBeInTheDocument();
  });
});
