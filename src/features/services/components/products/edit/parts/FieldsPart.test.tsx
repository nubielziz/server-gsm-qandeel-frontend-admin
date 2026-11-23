// Tests for the Field part of the edit view, opened through the whole page against the dev mock API: the three sections (how the service sells
// by quantity, the order fields a buyer fills in, the option lists), each its own form with its own Save, the messages of the server
// under the input they name, the repeated key, moving and removing a field, and what a role without catalog:update sees.
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
  it('adds a choice field after the saved one and saves the list in order', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    expect(await fields.findByRole('textbox', { name: 'Key of field 1' })).toHaveValue('account');
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Key of field 2' }), 'plan');
    await user.type(fields.getByRole('textbox', { name: 'Label of field 2' }), 'Plan');
    await user.selectOptions(fields.getByRole('combobox', { name: 'Type of field 2' }), 'Choice list');
    await user.type(fields.getByRole('textbox', { name: 'Choices of field 2' }), 'Basic, Pro');
    await user.click(fields.getByRole('checkbox', { name: 'Field 2 is required' }));
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect(screen.getByText('Z3X Credits x10 has 2 fields.')).toBeInTheDocument();
    const saved = (await getService(Z3X)).fields;
    expect(saved.map((field) => field.key)).toEqual(['account', 'plan']);
    expect(saved[1]).toMatchObject({ fieldType: 'select', options: ['Basic', 'Pro'], required: true });
    expect(await fields.findByText('Saved')).toBeInTheDocument();
    expect(fields.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows the choices box only for a choice list', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Key of field 1' });
    expect(fields.queryByRole('textbox', { name: 'Choices of field 1' })).not.toBeInTheDocument();
    await user.selectOptions(fields.getByRole('combobox', { name: 'Type of field 1' }), 'Choice list');
    expect(fields.getByRole('textbox', { name: 'Choices of field 1' })).toBeInTheDocument();
  });

  it('moves a field up and down, and keeps the first from going up and the last from going down', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Key of field 1' });
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Key of field 2' }), 'plan');
    await user.type(fields.getByRole('textbox', { name: 'Label of field 2' }), 'Plan');
    expect(fields.getByRole('button', { name: 'Move field 1 up' })).toBeDisabled();
    expect(fields.getByRole('button', { name: 'Move field 2 down' })).toBeDisabled();
    await user.click(fields.getByRole('button', { name: 'Move field 2 up' }));
    expect(fields.getByRole('textbox', { name: 'Key of field 1' })).toHaveValue('plan');
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
          { field: 'fields.0.supplierKey', message: 'The supplier has no such key.' },
          { field: 'fields.1.options', message: 'Add at least two choices.' },
          { field: 'fields.1.required', message: 'A choice list must be required.' },
          { field: 'fields.0.sort', message: 'The order sets the position.' },
        ]),
      ),
    );
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Key of field 1' });
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Key of field 2' }), 'plan');
    await user.type(fields.getByRole('textbox', { name: 'Label of field 2' }), 'Plan');
    await user.selectOptions(fields.getByRole('combobox', { name: 'Type of field 2' }), 'Choice list');
    await user.type(fields.getByRole('textbox', { name: 'Choices of field 2' }), 'Basic');
    await user.click(fields.getByRole('button', { name: 'Save' }));

    expect(await fields.findByText('That pattern is not valid.')).toBeInTheDocument();
    for (const message of [
      'That type is not offered.',
      'The supplier has no such key.',
      'Add at least two choices.',
      'A choice list must be required.',
    ]) {
      expect(fields.getByText(message)).toBeInTheDocument();
    }
    expect(fields.getByRole('textbox', { name: 'Pattern of field 1' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(fields.getByRole('textbox', { name: 'Supplier key of field 1' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(fields.getByRole('combobox', { name: 'Type of field 1' })).toHaveAttribute('aria-invalid', 'true');
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

  it('refuses a key that an earlier field already uses', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Key of field 1' });
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Key of field 2' }), 'account');
    await user.type(fields.getByRole('textbox', { name: 'Label of field 2' }), 'Again');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await fields.findByText('This key is used by an earlier field.')).toBeInTheDocument();
    expect((await getService(Z3X)).fields).toHaveLength(1);
  });

  it('removes a field', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Key of field 1' });
    await user.click(fields.getByRole('button', { name: 'Remove field 1' }));
    const none = fields.getByText(/No custom fields/);
    expect(none).toBeInTheDocument();
    // A plain line, as the other empty lines of the editor, not a bordered box.
    expect(none).not.toHaveClass('border');
    expect(none).not.toHaveClass('border-dashed');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Z3X Credits x10 has 0 fields.')).toBeInTheDocument();
    expect((await getService(Z3X)).fields).toEqual([]);
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
    const key = await fields.findByRole('textbox', { name: 'Key of field 1' });
    expect(key).toBeDisabled();
    expect(key).toHaveAttribute('title', title);
    expect(fields.getByRole('button', { name: 'Add a field' })).toBeDisabled();
    expect(section('Options').getByRole('textbox', { name: 'Models' })).toBeDisabled();
    for (const name of ['Quantity Field', 'Custom Fields', 'Options']) {
      expect(section(name).getByRole('button', { name: 'Save' })).toBeDisabled();
    }
  });
});
