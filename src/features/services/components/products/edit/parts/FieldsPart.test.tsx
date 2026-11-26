// Tests for the Field part of the edit view, opened through the whole page against the dev mock API: the three sections (how the service sells
// by quantity, the order fields a buyer fills in, the option lists), each its own form with its own Save, the messages of the server
// under the input they name, the repeated name, the main input switch, moving and removing a field, and what a role without catalog:update sees.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getService } from '../../../../api';
import { openProducts } from '../../../../test/productsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const AT_T = 5; // IMEI-ATT-USA, "AT&T USA Premier Unlock": one per order, three option lists
const Z3X = 15; // SRV-Z3X-10, "Z3X Credits x10": one order field, `account`

/** Opens the part for a service, signed in as the Owner (or with these permissions), once it has drawn its first section. */
async function openFields(id: number, type: string, options: { permissions?: string[] } = {}) {
  await openProducts(`/products?view=edit&type=${type}&id=${id}&part=fields`, options);
  await screen.findByRole('form', { name: 'Quantity Field' }, { timeout: 10_000 });
}

/** One section of the part by the name of its form. */
const section = (name: string) => within(screen.getByRole('form', { name }));

describe('Field: the sections', () => {
  it('draws the three sections under their headings, each with its own Save', async () => {
    await openFields(AT_T, 'imei');
    for (const name of ['Quantity Field', 'Custom Fields', 'Options']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
      expect(section(name).getByRole('button', { name: 'Save' })).toBeDisabled();
    }
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
          { field: 'fields.0.regex', message: 'That pattern is not valid.' },
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

    expect(await fields.findByText('That pattern is not valid.')).toBeInTheDocument();
    for (const message of [
      'That type is not offered.',
      'This field no longer exists. Reload the page.',
      'Add at least two choices.',
      'A choice list must be required.',
    ]) {
      expect(fields.getByText(message)).toBeInTheDocument();
    }
    expect(fields.getByRole('textbox', { name: 'Pattern of field 1' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
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

// The shop's order form draws only the service's custom fields (decision 029), so an IMEI service needs one marked Main input.
describe('Field: the main input warning', () => {
  const WARNING =
    'This IMEI service has no main input field. Buyers cannot order it in the shop until one field is marked Main input.';

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

  it('explains the main input on its switch', async () => {
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    const main = await fields.findByRole('button', { name: 'Main input of field 1' });
    expect(main).toHaveAttribute(
      'title',
      'The main input is the field the order itself is about, such as the IMEI; on an IMEI service the buyer types the IMEI in it. A service has at most one.',
    );
  });
});

describe('Field: the options', () => {
  it('shows each list as lines and saves the edited lists', async () => {
    const user = userEvent.setup();
    await openFields(AT_T, 'imei');
    const options = section('Options');
    expect(await options.findByRole('textbox', { name: 'Models' })).toHaveValue(
      'iphone15 | iPhone 15\niphone14 | iPhone 14',
    );
    expect(options.getByRole('textbox', { name: 'Networks' })).toHaveValue('att | AT&T USA | ATT');
    expect(options.getByText(/2 entries\./)).toBeInTheDocument();
    await user.type(options.getByRole('textbox', { name: 'MEP' }), 'mep1 | MEP one{Enter}mep2');
    await user.click(options.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Options saved')).toBeInTheDocument();
    expect(screen.getByText('AT&T USA Premier Unlock has 5 options.')).toBeInTheDocument();
    const saved = (await getService(AT_T)).options;
    expect(saved.filter((option) => option.list === 'mep')).toEqual([
      { list: 'mep', value: 'mep1', label: 'MEP one', supplierValue: '' },
      { list: 'mep', value: 'mep2', label: 'mep2', supplierValue: '' },
    ]);
    expect(options.getByRole('textbox', { name: 'MEP' })).toHaveValue('mep1 | MEP one\nmep2');
    expect(options.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('points at a line that has a label but no value', async () => {
    const user = userEvent.setup();
    await openFields(AT_T, 'imei');
    const options = section('Options');
    await user.type(await options.findByRole('textbox', { name: 'MEP' }), 'ok{Enter}| only a label');
    await user.click(options.getByRole('button', { name: 'Save' }));
    expect(await options.findByText('Line 2 has no value.')).toBeInTheDocument();
    expect((await getService(AT_T)).options).toHaveLength(3);
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
    expect(section('Options').getByRole('textbox', { name: 'Models' })).toBeDisabled();
    for (const name of ['Quantity Field', 'Custom Fields', 'Options']) {
      expect(section(name).getByRole('button', { name: 'Save' })).toBeDisabled();
    }
  });
});
