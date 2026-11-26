// Tests for the Field part of the edit view, opened through the whole page against the dev mock API: the two sections (how the service sells
// by quantity, the order fields a buyer fills in), each its own form with its own Save, the messages of the server under the input they
// name, the repeated name, the hidden pattern that a save sends back, the main input switch, moving and removing a field, and what a role
// without catalog:update sees.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { createService, getService } from '../../../../api';
import { servicesStore } from '../../../../mocks/store';
import { openProducts } from '../../../../test/productsPage';
import { recordRequests } from '../../../../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const AT_T = 5; // IMEI-ATT-USA, "AT&T USA Premier Unlock": one per order, no custom fields
const Z3X = 15; // SRV-Z3X-10, "Z3X Credits x10": one order field, `account`

/** Opens the part for a service, signed in as the Owner (or with these permissions), once it has drawn its first section. */
async function openFields(id: number, type: string, options: { permissions?: string[] } = {}) {
  await openProducts(`/products?view=edit&type=${type}&id=${id}&part=fields`, options);
  await screen.findByRole('form', { name: 'Quantity Field' }, { timeout: 10_000 });
}

/** One section of the part by the name of its form. */
const section = (name: string) => within(screen.getByRole('form', { name }));

describe('Field: the sections', () => {
  it('draws the two sections under their headings, each with its own Save, and no Options section', async () => {
    await openFields(AT_T, 'imei');
    for (const name of ['Quantity Field', 'Custom Fields']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
      expect(section(name).getByRole('button', { name: 'Save' })).toBeDisabled();
    }
    expect(screen.queryByRole('heading', { level: 3, name: 'Options' })).not.toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Options' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Models' })).not.toBeInTheDocument();
  });
});

describe('Field: the quantity', () => {
  it('shows how the service sells and saves a range', async () => {
    const user = userEvent.setup();
    await openFields(AT_T, 'imei');
    const quantity = section('Quantity Field');
    const way = quantity.getByRole('combobox', { name: 'Quantity' });
    expect(way).toHaveValue('single');
    expect(quantity.getByText(/Every order is for 1 unit\./)).toBeInTheDocument();
    await user.selectOptions(way, 'A range');
    expect(quantity.getByRole('textbox', { name: 'Smallest' })).toHaveValue('1');
    await user.type(quantity.getByRole('textbox', { name: 'Largest' }), '10');
    await user.click(quantity.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Quantity saved')).toBeInTheDocument();
    expect(await getService(AT_T)).toMatchObject({ minQty: 1, maxQty: 10, qtyOptions: [] });
    expect(await quantity.findByText('Saved')).toBeInTheDocument();
    expect(quantity.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves fixed packs in order and keeps the smallest and largest pack as the range', async () => {
    const user = userEvent.setup();
    await openFields(AT_T, 'imei');
    const quantity = section('Quantity Field');
    await user.selectOptions(quantity.getByRole('combobox', { name: 'Quantity' }), 'Fixed packs');
    await user.type(quantity.getByRole('textbox', { name: 'Pack sizes' }), '25, 5, 10');
    await user.click(quantity.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Quantity saved')).toBeInTheDocument();
    expect(await getService(AT_T)).toMatchObject({ minQty: 5, maxQty: 25, qtyOptions: [5, 10, 25] });
  });

  it('checks the range in the browser, under the box it is about', async () => {
    const user = userEvent.setup();
    await openFields(AT_T, 'imei');
    const quantity = section('Quantity Field');
    await user.selectOptions(quantity.getByRole('combobox', { name: 'Quantity' }), 'A range');
    const smallest = quantity.getByRole('textbox', { name: 'Smallest' });
    await user.clear(smallest);
    await user.type(smallest, '5');
    await user.type(quantity.getByRole('textbox', { name: 'Largest' }), '3');
    await user.click(quantity.getByRole('button', { name: 'Save' }));
    expect(
      await quantity.findByText('The largest quantity cannot be below the smallest (5).'),
    ).toBeInTheDocument();
    expect(await getService(AT_T)).toMatchObject({ minQty: 1, maxQty: 1 });
  });

  it('asks for at least one pack size', async () => {
    const user = userEvent.setup();
    await openFields(AT_T, 'imei');
    const quantity = section('Quantity Field');
    await user.selectOptions(quantity.getByRole('combobox', { name: 'Quantity' }), 'Fixed packs');
    await user.type(quantity.getByRole('textbox', { name: 'Pack sizes' }), ' ');
    await user.click(quantity.getByRole('button', { name: 'Save' }));
    expect(await quantity.findByText('Enter at least one pack size.')).toBeInTheDocument();
  });
});

describe('Field: the custom fields', () => {
  it('shows one name per field, with no key and no supplier key', async () => {
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    expect(await fields.findByRole('textbox', { name: 'Name of field 1' })).toHaveValue('user');
    expect(fields.getByRole('textbox', { name: 'Label of field 1' })).toHaveValue('Z3X account');
    expect(fields.getByRole('textbox', { name: 'Label of field 1' })).toHaveAttribute(
      'placeholder',
      'Same as the name',
    );
    expect(fields.queryByRole('textbox', { name: 'Key of field 1' })).not.toBeInTheDocument();
    expect(fields.queryByRole('textbox', { name: 'Supplier key of field 1' })).not.toBeInTheDocument();
    for (const header of ['Key', 'Supplier key']) {
      expect(fields.queryByRole('columnheader', { name: header })).not.toBeInTheDocument();
    }
    expect(fields.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
  });

  it('has no Pattern column and no pattern input', async () => {
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    expect(fields.queryByRole('columnheader', { name: 'Pattern' })).not.toBeInTheDocument();
    expect(fields.queryByRole('textbox', { name: 'Pattern of field 1' })).not.toBeInTheDocument();
    expect(fields.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'No.',
      'Name',
      'Label',
      'Type',
      'Required',
      'Actions',
    ]);
  });

  it('sends the pattern of a saved field back as it was saved, and an empty one for a new field', async () => {
    const user = userEvent.setup();
    // A pattern the supplier import made: nobody typed it, the table shows nothing of it.
    const pattern = '^[0-9]{15}$';
    const service = (await servicesStore()).services.find(String(Z3X));
    if (!service?.fields[0]) throw new Error('The seed has no field on the Z3X service.');
    service.fields[0].regex = pattern;
    const requests = recordRequests();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    const name = await fields.findByRole('textbox', { name: 'Name of field 1' });
    await user.clear(name);
    await user.type(name, 'Account name');
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 2' }), 'Plan');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();

    const put = requests.sent().filter((request) => request.method === 'PUT');
    expect(put).toHaveLength(1);
    expect(put[0]?.body).toMatchObject({
      fields: [
        { key: 'account', name: 'Account name', regex: pattern },
        { name: 'Plan', regex: '' },
      ],
    });
    expect((await getService(Z3X)).fields.map((field) => [field.key, field.regex])).toEqual([
      ['account', pattern],
      ['plan', ''],
    ]);
    // A second save, from the list the server answered, still sends it back.
    await user.type(fields.getByRole('textbox', { name: 'Label of field 1' }), ' again');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(requests.sent().filter((request) => request.method === 'PUT')).toHaveLength(2),
    );
    expect((await getService(Z3X)).fields[0]).toMatchObject({ regex: pattern });
  });

  it('adds a choice field after the saved one and saves the list in order, the server making its key from its name', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    expect(await fields.findByRole('textbox', { name: 'Name of field 1' })).toHaveValue('user');
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 2' }), 'Plan');
    await user.selectOptions(fields.getByRole('combobox', { name: 'Type of field 2' }), 'Choice list');
    await user.type(fields.getByRole('textbox', { name: 'Choices of field 2' }), 'Basic, Pro');
    await user.click(fields.getByRole('checkbox', { name: 'Field 2 is required' }));
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect(screen.getByText('Z3X Credits x10 has 2 fields.')).toBeInTheDocument();
    const saved = (await getService(Z3X)).fields;
    expect(saved.map((field) => field.key)).toEqual(['account', 'plan']);
    // The label was left empty, so the server stored the name.
    expect(saved[1]).toMatchObject({
      name: 'Plan',
      label: 'Plan',
      fieldType: 'select',
      options: ['Basic', 'Pro'],
      required: true,
      isMainInput: false,
    });
    expect(await fields.findByText('Saved')).toBeInTheDocument();
    expect(fields.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('keeps the key of a saved field when its name changes, and its label when it is left as it was', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    const name = await fields.findByRole('textbox', { name: 'Name of field 1' });
    await user.clear(name);
    await user.type(name, 'Account name');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect((await getService(Z3X)).fields).toMatchObject([
      { key: 'account', name: 'Account name', label: 'Z3X account' },
    ]);
  });

  it('stores the name as the label when the label is emptied', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await user.clear(await fields.findByRole('textbox', { name: 'Label of field 1' }));
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect((await getService(Z3X)).fields).toMatchObject([{ key: 'account', name: 'user', label: 'user' }]);
  });

  it('asks for a name before it sends anything', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await user.clear(await fields.findByRole('textbox', { name: 'Name of field 1' }));
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await fields.findByText('Enter a name.')).toBeInTheDocument();
    expect((await getService(Z3X)).fields[0]).toMatchObject({ name: 'user' });
  });

  it.each([
    ['an IMEI service', AT_T, 'imei'],
    ['a server service', Z3X, 'server'],
  ])('offers the IMEI (15 digits) type on %s, and saves a field of it', async (_name, id, type) => {
    const user = userEvent.setup();
    await openFields(id, type);
    const fields = section('Custom Fields');
    await fields.findByRole('button', { name: 'Add a field' });
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    const count = (await getService(id)).fields.length;
    const menu = fields.getByRole('combobox', { name: `Type of field ${count + 1}` });
    expect(
      within(menu)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Text', 'Number', 'Choice list', 'Long text', 'IMEI (15 digits)']);
    await user.type(fields.getByRole('textbox', { name: `Name of field ${count + 1}` }), 'Device IMEI');
    await user.selectOptions(menu, 'IMEI (15 digits)');
    expect(fields.queryByRole('textbox', { name: `Choices of field ${count + 1}` })).not.toBeInTheDocument();
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    const saved = (await getService(id)).fields;
    expect(saved[count]).toMatchObject({ name: 'Device IMEI', fieldType: 'imei', options: [] });
  });

  it('shows the choices box only for a choice list', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    expect(fields.queryByRole('textbox', { name: 'Choices of field 1' })).not.toBeInTheDocument();
    await user.selectOptions(fields.getByRole('combobox', { name: 'Type of field 1' }), 'Choice list');
    expect(fields.getByRole('textbox', { name: 'Choices of field 1' })).toBeInTheDocument();
  });

  it('moves a field up and down, and keeps the first from going up and the last from going down', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 2' }), 'Plan');
    await user.type(fields.getByRole('textbox', { name: 'Label of field 2' }), 'Plan');
    expect(fields.getByRole('button', { name: 'Move field 1 up' })).toBeDisabled();
    expect(fields.getByRole('button', { name: 'Move field 2 down' })).toBeDisabled();
    await user.click(fields.getByRole('button', { name: 'Move field 2 up' }));
    expect(fields.getByRole('textbox', { name: 'Name of field 1' })).toHaveValue('Plan');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect((await getService(Z3X)).fields.map((field) => field.key)).toEqual(['plan', 'account']);
  });

  it('shows each message of the server under the input it names, and the rest in the failure line', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.put('*/admin/services/:id/fields', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'fields.0.fieldType', message: 'That type is not offered.' },
          { field: 'fields.0.key', message: 'This field no longer exists. Reload the page.' },
          { field: 'fields.1.name', message: 'The name Plan is used by an earlier field.' },
          { field: 'fields.1.options', message: 'Add at least two choices.' },
          { field: 'fields.1.required', message: 'A choice list must be required.' },
          { field: 'fields.1.isMainInput', message: 'Only one field can be the main input.' },
          { field: 'fields.0.sort', message: 'The order sets the position.' },
        ]),
      ),
    );
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 2' }), 'Plan');
    await user.selectOptions(fields.getByRole('combobox', { name: 'Type of field 2' }), 'Choice list');
    await user.type(fields.getByRole('textbox', { name: 'Choices of field 2' }), 'Basic');
    await user.click(fields.getByRole('button', { name: 'Save' }));

    expect(await fields.findByText('That type is not offered.')).toBeInTheDocument();
    for (const message of [
      'That type is not offered.',
      'This field no longer exists. Reload the page.',
      'Add at least two choices.',
      'A choice list must be required.',
    ]) {
      expect(fields.getByText(message)).toBeInTheDocument();
    }
    // The hidden key has no cell of its own: its message is under the row's name.
    expect(fields.getByRole('textbox', { name: 'Name of field 1' })).toHaveAttribute('aria-invalid', 'true');
    expect(fields.getByRole('combobox', { name: 'Type of field 1' })).toHaveAttribute('aria-invalid', 'true');
    // The name and the main-input flag of row 2 share the name input: the later message wins there.
    expect(fields.getByRole('textbox', { name: 'Name of field 2' })).toHaveAttribute('aria-invalid', 'true');
    // The server calls the choices `options`; they show under the choices input.
    expect(fields.getByRole('textbox', { name: 'Choices of field 2' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(fields.getByRole('checkbox', { name: 'Field 2 is required' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    // A column the row has no input for is not lost: it is in the failure line.
    expect(fields.getByRole('alert')).toHaveTextContent('fields.0.sort: The order sets the position.');
  });

  it("shows a message about a field's pattern under the row's name, as the pattern has no input", async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.put('*/admin/services/:id/fields', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'fields.0.regex', message: 'That pattern is not valid.' },
        ]),
      ),
    );
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    const name = await fields.findByRole('textbox', { name: 'Name of field 1' });
    await user.type(name, ' x');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await fields.findByText('That pattern is not valid.')).toBeInTheDocument();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    // Nothing is left for the failure line: the message found its place.
    expect(fields.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('refuses a name that an earlier field already uses, whatever its letter case', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 2' }), 'USER');
    await user.type(fields.getByRole('textbox', { name: 'Label of field 2' }), 'Again');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await fields.findByText('This name is used by an earlier field.')).toBeInTheDocument();
    expect(fields.getByRole('textbox', { name: 'Name of field 2' })).toHaveAttribute('aria-invalid', 'true');
    expect((await getService(Z3X)).fields).toHaveLength(1);
  });

  it('removes a field', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    await user.click(fields.getByRole('button', { name: 'Remove field 1' }));
    const none = fields.getByText(
      'No custom fields. The order form shows no input box: add the fields the buyer must fill in.',
    );
    expect(none).toBeInTheDocument();
    // A plain line, as the other empty lines of the editor, not a bordered box.
    expect(none).not.toHaveClass('border');
    expect(none).not.toHaveClass('border-dashed');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Z3X Credits x10 has 0 fields.')).toBeInTheDocument();
    expect((await getService(Z3X)).fields).toEqual([]);
  });
});

describe('Field: the main input', () => {
  it('shows a badge beside the name of the main input, and none for the other fields', async () => {
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    expect(fields.queryByText('Main input')).not.toBeInTheDocument();
    expect(fields.getByRole('button', { name: 'Main input of field 1' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    // There is no column for it: the switch lives in the row's buttons.
    expect(fields.queryByRole('columnheader', { name: 'Main input' })).not.toBeInTheDocument();
  });

  it('turns it on for one row and off for the others, and saves the flag', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 2' }), 'Serial');
    const first = fields.getByRole('button', { name: 'Main input of field 1' });
    const second = fields.getByRole('button', { name: 'Main input of field 2' });

    await user.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(fields.getAllByText('Main input')).toHaveLength(1);
    await user.click(second);
    expect(first).toHaveAttribute('aria-pressed', 'false');
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(fields.getAllByText('Main input')).toHaveLength(1);

    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect((await getService(Z3X)).fields.map((field) => [field.key, field.isMainInput])).toEqual([
      ['account', false],
      ['serial', true],
    ]);
    expect(fields.getAllByText('Main input')).toHaveLength(1);
  });

  it('turns it off again, which marks the section as changed', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    const save = fields.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    const first = fields.getByRole('button', { name: 'Main input of field 1' });
    await user.click(first);
    expect(save).toBeEnabled();
    await user.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'false');
    expect(fields.queryByText('Main input')).not.toBeInTheDocument();
    expect(save).toBeDisabled();
  });
});

// The shop's order form draws only the service's custom fields (decision 029); an IMEI service forces nothing (decision 031), so the
// warning is only advice to mark the field the order is about.
describe('Field: the main input warning', () => {
  const WARNING =
    'No field is marked Main input. Mark the field the order is about (the IMEI, a serial, an ECID) so the supplier receives it.';

  it('says so on an IMEI service with no fields, and follows the main input switch of the draft', async () => {
    const user = userEvent.setup();
    await openFields(AT_T, 'imei');
    const fields = section('Custom Fields');
    expect(await fields.findByText(WARNING)).toBeInTheDocument();
    expect(fields.getByText(/No custom fields\. The order form shows no input box/)).toBeInTheDocument();
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 1' }), 'Serial');
    expect(fields.getByText(WARNING)).toBeInTheDocument();
    const main = fields.getByRole('button', { name: 'Main input of field 1' });
    await user.click(main);
    expect(fields.queryByText(WARNING)).not.toBeInTheDocument();
    await user.click(main);
    expect(fields.getByText(WARNING)).toBeInTheDocument();
  });

  it('is advice only: the section still saves with the warning showing', async () => {
    const user = userEvent.setup();
    await openFields(AT_T, 'imei');
    const fields = section('Custom Fields');
    await fields.findByText(WARNING);
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 1' }), 'Serial');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect((await getService(AT_T)).fields.map((field) => [field.key, field.isMainInput])).toEqual([
      ['serial', false],
    ]);
    expect(fields.getByText(WARNING)).toBeInTheDocument();
  });

  it('is hidden on a service that is not an IMEI service, with no main input', async () => {
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    expect(fields.getByRole('button', { name: 'Main input of field 1' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(fields.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('does not show for an IMEI service added by hand, whose default IMEI field is its main input', async () => {
    await signInAs();
    const made = await createService({
      name: 'Hand Made',
      code: 'IMEI-HAND-1',
      categoryId: 1,
      type: 'imei',
      slaMinutes: 30,
      basePrice: '4.0000',
    });
    await openFields(made.id, 'imei');
    const fields = section('Custom Fields');
    expect(await fields.findByRole('textbox', { name: 'Name of field 1' })).toHaveValue('IMEI');
    expect(fields.getByRole('textbox', { name: 'Label of field 1' })).toHaveValue('IMEI');
    expect(fields.getByRole('combobox', { name: 'Type of field 1' })).toHaveValue('imei');
    expect(fields.getByRole('checkbox', { name: 'Field 1 is required' })).toBeChecked();
    expect(fields.getByText('Main input')).toBeInTheDocument();
    expect(fields.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('explains the main input on its switch', async () => {
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    const main = await fields.findByRole('button', { name: 'Main input of field 1' });
    expect(main).toHaveAttribute(
      'title',
      "The main input is the field the order itself is about, such as the IMEI, a serial number or an ECID: the supplier receives it as the order's own input. A service has at most one.",
    );
  });
});

describe('Field: what a role may change', () => {
  it('shows every box off with the missing permission named for a role that may only read', async () => {
    await openFields(Z3X, 'server', { permissions: ['catalog:read'] });
    const title = 'You need the catalog:update permission';
    const way = section('Quantity Field').getByRole('combobox', { name: 'Quantity' });
    expect(way).toBeDisabled();
    expect(way).toHaveAttribute('title', title);
    const fields = section('Custom Fields');
    const name = await fields.findByRole('textbox', { name: 'Name of field 1' });
    expect(name).toBeDisabled();
    expect(name).toHaveAttribute('title', title);
    expect(fields.getByRole('button', { name: 'Main input of field 1' })).toBeDisabled();
    expect(fields.getByRole('button', { name: 'Add a field' })).toBeDisabled();
    for (const name of ['Quantity Field', 'Custom Fields']) {
      expect(section(name).getByRole('button', { name: 'Save' })).toBeDisabled();
    }
  });
});
