// Tests for the dialogs opened from the Services tab: edit price (the floor and margin the server returns, and its refusal under
// the field), New service and Edit service, group prices, fields, options and delete. Each saves through the dev mock API, so a
// test reads the service again to see what was stored.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { createService, getService, listServices } from '../api';
import { groupHandlers } from '../mocks/testGroups';
import { dialogOf, openServices, pickFromRowMenu, serviceRow } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
// The merchants feature serves the group list; these tests bring their own copy of it.
beforeEach(() => mockServer.use(...groupHandlers));

type User = ReturnType<typeof userEvent.setup>;

/** Clears a box and types into it. */
async function retype(user: User, box: HTMLElement, text: string) {
  await user.clear(box);
  await user.type(box, text);
}

describe('Edit price', () => {
  async function openPrice(user: User, name: string, now: string) {
    await openServices();
    const row = await serviceRow(name);
    await user.click(row.getByRole('button', { name: `Edit price of ${name}, now ${now}` }));
    return within(await screen.findByRole('dialog', { name: 'Edit price' }));
  }

  it('shows the cost and the floor the server worked out, and saves a new price', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'AT&T USA Premier Unlock', '$17.28');
    expect(dialog.getByText('Supplier cost')).toBeInTheDocument();
    expect(dialog.getByText('$13.50')).toBeInTheDocument();
    expect(dialog.getByText('$14.31')).toBeInTheDocument();
    const price = dialog.getByRole('textbox', { name: 'Base price (USD)' });
    expect(price).toHaveValue('17.28');
    await retype(user, price, '15');
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(await screen.findByText('Price updated')).toBeInTheDocument();
    expect(
      screen.getByText('AT&T USA Premier Unlock is now $15.00. Floor $14.31, margin 10%. New orders use it.'),
    ).toBeInTheDocument();
    expect((await getService(5)).basePrice).toBe('15.0000');
    expect(screen.queryByRole('dialog', { name: 'Edit price' })).not.toBeInTheDocument();
  });

  it('shows the server’s refusal of a price under the floor under the field and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'AT&T USA Premier Unlock', '$17.28');
    await retype(user, dialog.getByRole('textbox', { name: 'Base price (USD)' }), '14');
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(
      await dialog.findByText('Below the floor. Cost $13.50 plus minimum profit $0.81 is $14.31.'),
    ).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Base price (USD)' })).toHaveAttribute('aria-invalid', 'true');
    expect((await getService(5)).basePrice).toBe('17.2800');
  });

  it('keeps a typed mistake in the browser and asks for a price', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'AT&T USA Premier Unlock', '$17.28');
    await retype(user, dialog.getByRole('textbox', { name: 'Base price (USD)' }), 'abc');
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(await dialog.findByText('Enter a price greater than zero.')).toBeInTheDocument();
  });

  it('sends only what changed: a new minimum profit raises the floor and the toast says the price is under it', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'AT&T USA Premier Unlock', '$17.28');
    await retype(user, dialog.getByRole('textbox', { name: 'Minimum profit (USD)' }), '5');
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(await screen.findByText(/Floor \$18\.50, margin 21\.9%\./)).toBeInTheDocument();
    expect(screen.getByText(/It is still under the floor/)).toBeInTheDocument();
    const saved = await getService(5);
    expect(saved).toMatchObject({ basePrice: '17.2800', minProfit: '5.0000', belowFloor: true });
  });

  it('says so when nothing changed', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'AT&T USA Premier Unlock', '$17.28');
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });

  it('shows what the supplier changed the cost from', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'Chimera Tool 1 Month', '$19.50');
    expect(dialog.getByText('(was $17.00)')).toBeInTheDocument();
    expect(dialog.getByText('$20.99')).toBeInTheDocument();
  });
});

describe('New service', () => {
  it('creates a service and tells the admin to link it to a supplier', async () => {
    const user = userEvent.setup();
    await openServices();
    await user.click(await screen.findByRole('button', { name: 'New service' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New service' }));
    await dialog.findByRole('option', { name: 'Apple' });
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Test Unlock');
    await user.type(dialog.getByRole('textbox', { name: 'Code' }), 'IMEI-TEST-1');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Apple');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Type' }), 'File');
    await retype(user, dialog.getByRole('textbox', { name: 'SLA (minutes)' }), '30');
    await user.type(dialog.getByRole('textbox', { name: 'Base price (USD)' }), '2.5');
    await user.click(dialog.getByRole('button', { name: 'Create service' }));

    expect(await screen.findByText('Test Unlock created')).toBeInTheDocument();
    expect(screen.getByText(/Link it to a supplier on the Suppliers page/)).toBeInTheDocument();
    const [created] = (await listServices({ q: 'IMEI-TEST-1' })).data;
    expect(created).toMatchObject({ name: 'Test Unlock', type: 'file', slaMinutes: 30, basePrice: '2.5000' });
    expect(created.category?.name).toBe('Apple');
  });

  it('shows a code that is taken under the Code field, in the server’s words', async () => {
    const user = userEvent.setup();
    await openServices();
    await user.click(await screen.findByRole('button', { name: 'New service' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New service' }));
    await dialog.findByRole('option', { name: 'Apple' });
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Another AT&T');
    await user.type(dialog.getByRole('textbox', { name: 'Code' }), 'IMEI-ATT-USA');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Apple');
    await user.type(dialog.getByRole('textbox', { name: 'Base price (USD)' }), '9');
    await user.click(dialog.getByRole('button', { name: 'Create service' }));
    expect(
      await dialog.findByText('The code IMEI-ATT-USA is already used by AT&T USA Premier Unlock.'),
    ).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Code' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a message the server gives for the Type, which has no other place to go', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/services', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'type', message: 'Servers are not sold in this category.' },
        ]),
      ),
    );
    await openServices();
    await user.click(await screen.findByRole('button', { name: 'New service' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New service' }));
    await dialog.findByRole('option', { name: 'Apple' });
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Odd Service');
    await user.type(dialog.getByRole('textbox', { name: 'Code' }), 'ODD-1');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Apple');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Type' }), 'Server');
    await user.type(dialog.getByRole('textbox', { name: 'Base price (USD)' }), '3');
    await user.click(dialog.getByRole('button', { name: 'Create service' }));
    expect(await dialog.findByText('Servers are not sold in this category.')).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Type' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('says so, with a Retry, when the categories could not be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/service-categories', () => problem(403, 'FORBIDDEN', 'No access', 'Closed.')),
    );
    await openServices();
    await user.click(await screen.findByRole('button', { name: 'New service' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New service' }));
    expect(await dialog.findByText(/Could not load the categories\./)).toBeInTheDocument();
    mockServer.resetHandlers();
    mockServer.use(...groupHandlers);
    await user.click(dialog.getByRole('button', { name: 'Retry' }));
    expect(await dialog.findByRole('option', { name: 'Apple' })).toBeInTheDocument();
    expect(dialog.queryByText(/Could not load the categories/)).not.toBeInTheDocument();
  });

  it('asks for the fields it needs before it calls the server', async () => {
    const user = userEvent.setup();
    await openServices();
    await user.click(await screen.findByRole('button', { name: 'New service' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New service' }));
    await user.click(dialog.getByRole('button', { name: 'Create service' }));
    expect(await dialog.findByText('Enter a name.')).toBeInTheDocument();
    expect(dialog.getByText('Enter a code.')).toBeInTheDocument();
    expect(dialog.getByText('Choose a category.')).toBeInTheDocument();
    expect(dialog.getByText('Enter a price greater than zero.')).toBeInTheDocument();
  });
});

describe('Edit service', () => {
  it('shows the linked suppliers read-only with links to the Suppliers page, and sends only the SLA that changed', async () => {
    const user = userEvent.setup();
    await openServices();
    await pickFromRowMenu(user, 'EE UK Unlock', 'Edit service…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit service' }));
    expect(dialog.getByRole('link', { name: 'Bosphorus Unlock' })).toHaveAttribute(
      'href',
      '/suppliers?supplier=6',
    );
    expect(dialog.getByRole('link', { name: 'Nordic GSM' })).toHaveAttribute('href', '/suppliers?supplier=1');
    expect(dialog.getByRole('textbox', { name: 'Code' })).toHaveValue('IMEI-EE-UK');
    await retype(user, dialog.getByRole('textbox', { name: 'SLA (minutes)' }), '90');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('EE UK Unlock updated')).toBeInTheDocument();
    expect(await getService(9)).toMatchObject({ slaMinutes: 90, code: 'IMEI-EE-UK' });
  });

  it('puts a message about the price, which an edit has no input for, in the dialog’s error slot', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/services/:id', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'basePrice', message: 'The price is locked by a promo.' },
        ]),
      ),
    );
    await openServices();
    await pickFromRowMenu(user, 'EE UK Unlock', 'Edit service…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit service' }));
    await retype(user, dialog.getByRole('textbox', { name: 'SLA (minutes)' }), '90');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('basePrice: The price is locked by a promo.');
  });

  it('keeps the service’s own category chosen while the category names load', async () => {
    const user = userEvent.setup();
    await openServices();
    await pickFromRowMenu(user, 'EE UK Unlock', 'Edit service…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit service' }));
    await dialog.findByRole('option', { name: 'Apple' });
    expect(dialog.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Carrier unlock');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Apple');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('EE UK Unlock updated')).toBeInTheDocument();
    expect((await getService(9)).category?.name).toBe('Apple');
  });

  it('says so when nothing changed', async () => {
    const user = userEvent.setup();
    await openServices();
    await pickFromRowMenu(user, 'EE UK Unlock', 'Edit service…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit service' }));
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });
});

describe('Group prices', () => {
  it('starts from the saved prices, one box per merchant group, and saves the new list', async () => {
    const user = userEvent.setup();
    await openServices();
    await pickFromRowMenu(user, 'AT&T USA Premier Unlock', 'Group prices…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Group prices' }));
    expect(await dialog.findByRole('textbox', { name: 'VIP' })).toHaveValue('15.90');
    expect(dialog.getByRole('textbox', { name: 'Standard' })).toHaveValue('');
    expect(dialog.getByText('Pays the base price less 4%.')).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Wholesale' }), '16.25');
    await user.click(dialog.getByRole('button', { name: 'Save group prices' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect((await getService(5)).groupPrices).toEqual([
      { groupId: 2, price: '16.2500' },
      { groupId: 3, price: '15.9000' },
    ]);
  });

  it('removes a group price when its box is emptied', async () => {
    const user = userEvent.setup();
    await openServices();
    await pickFromRowMenu(user, 'AT&T USA Premier Unlock', 'Group prices…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Group prices' }));
    await user.clear(await dialog.findByRole('textbox', { name: 'VIP' }));
    await user.click(dialog.getByRole('button', { name: 'Save group prices' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect((await getService(5)).groupPrices).toEqual([]);
  });

  it('asks for a price above zero under the box', async () => {
    const user = userEvent.setup();
    await openServices();
    await pickFromRowMenu(user, 'AT&T USA Premier Unlock', 'Group prices…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Group prices' }));
    await user.type(await dialog.findByRole('textbox', { name: 'Standard' }), '0');
    await user.click(dialog.getByRole('button', { name: 'Save group prices' }));
    expect(await dialog.findByText('Enter a price greater than zero.')).toBeInTheDocument();
    expect((await getService(5)).groupPrices).toHaveLength(1);
  });
});

describe('Fields', () => {
  it('adds a choice field after the saved one and saves the list in order', async () => {
    const user = userEvent.setup();
    await openServices('/services?q=Z3X');
    await pickFromRowMenu(user, 'Z3X Credits x10', 'Fields…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Fields' }));
    expect(await dialog.findByRole('textbox', { name: 'Key of field 1' })).toHaveValue('account');
    await user.click(dialog.getByRole('button', { name: 'Add a field' }));
    await user.type(dialog.getByRole('textbox', { name: 'Key of field 2' }), 'plan');
    await user.type(dialog.getByRole('textbox', { name: 'Label of field 2' }), 'Plan');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Type of field 2' }), 'Choice list');
    await user.type(dialog.getByRole('textbox', { name: 'Choices of field 2' }), 'Basic, Pro');
    await user.click(dialog.getByRole('checkbox', { name: 'Field 2 is required' }));
    await user.click(dialog.getByRole('button', { name: 'Save fields' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect(screen.getByText('Z3X Credits x10 has 2 fields.')).toBeInTheDocument();
    const { fields } = await getService(15);
    expect(fields.map((field) => field.key)).toEqual(['account', 'plan']);
    expect(fields[1]).toMatchObject({ fieldType: 'select', options: ['Basic', 'Pro'], required: true });
  });

  it('shows each message of the server under the input it names, and the rest in the error slot', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.put('*/admin/services/:id/fields', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'fields.0.fieldType', message: 'That type is not offered.' },
          { field: 'fields.0.regex', message: 'That pattern is not valid.' },
          { field: 'fields.0.supplierKey', message: 'The supplier has no such key.' },
          { field: 'fields.1.options', message: 'Add at least two choices.' },
          { field: 'fields.1.required', message: 'A choice list must be required.' },
          { field: 'fields.0.sort', message: 'The order sets the position.' },
        ]),
      ),
    );
    await openServices('/services?q=Z3X');
    await pickFromRowMenu(user, 'Z3X Credits x10', 'Fields…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Fields' }));
    await dialog.findByRole('textbox', { name: 'Key of field 1' });
    await user.click(dialog.getByRole('button', { name: 'Add a field' }));
    await user.type(dialog.getByRole('textbox', { name: 'Key of field 2' }), 'plan');
    await user.type(dialog.getByRole('textbox', { name: 'Label of field 2' }), 'Plan');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Type of field 2' }), 'Choice list');
    await user.type(dialog.getByRole('textbox', { name: 'Choices of field 2' }), 'Basic');
    await user.click(dialog.getByRole('button', { name: 'Save fields' }));

    expect(await dialog.findByText('That pattern is not valid.')).toBeInTheDocument();
    for (const message of [
      'That type is not offered.',
      'The supplier has no such key.',
      'Add at least two choices.',
      'A choice list must be required.',
    ]) {
      expect(dialog.getByText(message)).toBeInTheDocument();
    }
    expect(dialog.getByRole('textbox', { name: 'Pattern of field 1' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(dialog.getByRole('textbox', { name: 'Supplier key of field 1' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(dialog.getByRole('combobox', { name: 'Type of field 1' })).toHaveAttribute('aria-invalid', 'true');
    // The server calls the choices `options`; they show under the choices input.
    expect(dialog.getByRole('textbox', { name: 'Choices of field 2' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(dialog.getByRole('checkbox', { name: 'Field 2 is required' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    // A column the row has no input for is not lost: it is in the error slot.
    expect(dialog.getByRole('alert')).toHaveTextContent('fields.0.sort: The order sets the position.');
  });

  it('refuses a key that an earlier field already uses', async () => {
    const user = userEvent.setup();
    await openServices('/services?q=Z3X');
    await pickFromRowMenu(user, 'Z3X Credits x10', 'Fields…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Fields' }));
    await dialog.findByRole('textbox', { name: 'Key of field 1' });
    await user.click(dialog.getByRole('button', { name: 'Add a field' }));
    await user.type(dialog.getByRole('textbox', { name: 'Key of field 2' }), 'account');
    await user.type(dialog.getByRole('textbox', { name: 'Label of field 2' }), 'Again');
    await user.click(dialog.getByRole('button', { name: 'Save fields' }));
    expect(await dialog.findByText('This key is used by an earlier field.')).toBeInTheDocument();
    expect((await getService(15)).fields).toHaveLength(1);
  });

  it('removes a field', async () => {
    const user = userEvent.setup();
    await openServices('/services?q=Z3X');
    await pickFromRowMenu(user, 'Z3X Credits x10', 'Fields…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Fields' }));
    await dialog.findByRole('textbox', { name: 'Key of field 1' });
    await user.click(dialog.getByRole('button', { name: 'Remove field 1' }));
    expect(dialog.getByText(/No custom fields/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Save fields' }));
    expect(await screen.findByText('Z3X Credits x10 has 0 fields.')).toBeInTheDocument();
    expect((await getService(15)).fields).toEqual([]);
  });
});

describe('Options', () => {
  it('shows each list as lines and saves the edited lists', async () => {
    const user = userEvent.setup();
    await openServices();
    await pickFromRowMenu(user, 'AT&T USA Premier Unlock', 'Options…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Options' }));
    const models = await dialog.findByRole('textbox', { name: 'Models' });
    expect(models).toHaveValue('iphone15 | iPhone 15\niphone14 | iPhone 14');
    expect(dialog.getByRole('textbox', { name: 'Networks' })).toHaveValue('att | AT&T USA | ATT');
    expect(dialog.getByText(/2 entries\./)).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'MEP' }), 'mep1 | MEP one{Enter}mep2');
    await user.click(dialog.getByRole('button', { name: 'Save options' }));
    expect(await screen.findByText('Options saved')).toBeInTheDocument();
    expect(screen.getByText('AT&T USA Premier Unlock has 5 options.')).toBeInTheDocument();
    const { options } = await getService(5);
    expect(options.filter((option) => option.list === 'mep')).toEqual([
      { list: 'mep', value: 'mep1', label: 'MEP one', supplierValue: '' },
      { list: 'mep', value: 'mep2', label: 'mep2', supplierValue: '' },
    ]);
  });

  it('points at a line that has a label but no value', async () => {
    const user = userEvent.setup();
    await openServices();
    await pickFromRowMenu(user, 'AT&T USA Premier Unlock', 'Options…');
    const dialog = within(await screen.findByRole('dialog', { name: 'Options' }));
    await user.type(await dialog.findByRole('textbox', { name: 'MEP' }), 'ok{Enter}| only a label');
    await user.click(dialog.getByRole('button', { name: 'Save options' }));
    expect(await dialog.findByText('Line 2 has no value.')).toBeInTheDocument();
    expect((await getService(5)).options).toHaveLength(3);
  });
});

describe('Delete', () => {
  it('unticks the service it deleted', async () => {
    const user = userEvent.setup();
    await signInAs();
    await createService({
      name: 'Temporary Check',
      code: 'TMP-2',
      categoryId: 1,
      type: 'imei',
      slaMinutes: 5,
      basePrice: '1.0000',
    });
    await openServices('/services?q=Temporary');
    await user.click(await screen.findByRole('checkbox', { name: /^Select row / }));
    expect(screen.getByRole('region', { name: 'Selected services' })).toBeInTheDocument();
    await pickFromRowMenu(user, 'Temporary Check', 'Delete…');
    await user.click(dialogOf('Delete Temporary Check?').getByRole('button', { name: 'Delete service' }));
    expect(await screen.findByText('Temporary Check deleted')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Selected services' })).not.toBeInTheDocument();
  });

  it('shows the server’s refusal for a service that has orders and keeps it', async () => {
    const user = userEvent.setup();
    await openServices('/services?q=Z3X');
    await pickFromRowMenu(user, 'Z3X Credits x10', 'Delete…');
    const dialog = dialogOf('Delete Z3X Credits x10?');
    await user.click(dialog.getByRole('button', { name: 'Delete service' }));
    expect(
      await dialog.findByText('Z3X Credits x10 has 38 orders, so it cannot be deleted. Disable it instead.'),
    ).toBeInTheDocument();
    expect((await getService(15)).name).toBe('Z3X Credits x10');
  });

  it('deletes a service nobody ordered', async () => {
    const user = userEvent.setup();
    await signInAs();
    const made = await createService({
      name: 'Temporary Check',
      code: 'TMP-1',
      categoryId: 1,
      type: 'imei',
      slaMinutes: 5,
      basePrice: '1.0000',
    });
    await openServices('/services?q=Temporary');
    await pickFromRowMenu(user, 'Temporary Check', 'Delete…');
    await user.click(dialogOf('Delete Temporary Check?').getByRole('button', { name: 'Delete service' }));
    expect(await screen.findByText('Temporary Check deleted')).toBeInTheDocument();
    await expect(getService(made.id)).rejects.toMatchObject({ status: 404 });
  });
});
