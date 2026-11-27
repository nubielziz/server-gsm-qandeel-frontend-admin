// Tests for the Field part of the edit view, opened through the whole page against the dev mock API: the one Custom Fields section (the order
// fields a buyer fills in, and under their table how the service sells by quantity) with its one Save that sends only the part that changed
// (decision 032), the messages of the server under the input they name, the repeated name, the hidden pattern that a save sends back, the
// main input tick box column, moving and removing a field, and what a role without catalog:update sees.
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

/** The type menu of a field, in order: the four plain types, "IMEI (15 digits)" and the ten more (decision 034). */
const ALL_TYPE_LABELS = [
  'Text',
  'Number',
  'Choice list',
  'Long text',
  'IMEI (15 digits)',
  'IMEI list (one per line, up to 30)',
  'IMEISV (16 digits)',
  'Serial number',
  'ICCID (SIM number)',
  'EID (eSIM, 32 digits)',
  'MEID',
  'ECID',
  'MAC address',
  'Mi lock code',
  'Box serial number',
];

const AT_T = 5; // IMEI-ATT-USA, "AT&T USA Premier Unlock": one per order, no custom fields
const Z3X = 15; // SRV-Z3X-10, "Z3X Credits x10": one order field, `account`

/** Opens the part for a service, signed in as the Owner (or with these permissions), once it has drawn its section. */
async function openFields(id: number, type: string, options: { permissions?: string[] } = {}) {
  await openProducts(`/products?view=edit&type=${type}&id=${id}&part=fields`, options);
  await screen.findByRole('form', { name: 'Custom Fields' }, { timeout: 10_000 });
}

/** One section of the part by the name of its form. */
const section = (name: string) => within(screen.getByRole('form', { name }));

describe('Field: the section', () => {
  it('draws one section, Custom Fields, with one Save and the quantity under the table, and no Quantity Field or Options section', async () => {
    await openFields(Z3X, 'server');
    expect(screen.getByRole('heading', { level: 3, name: 'Custom Fields' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
    expect(screen.getAllByRole('form')).toHaveLength(1);
    const fields = section('Custom Fields');
    expect(fields.getAllByRole('button', { name: 'Save' })).toHaveLength(1);
    expect(fields.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: 'Quantity Field' })).not.toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Quantity Field' })).not.toBeInTheDocument();

    // The order on the page: the table, Add a field, the quantity menu, Save.
    const table = fields.getByRole('table', { name: 'Custom fields' });
    const add = fields.getByRole('button', { name: 'Add a field' });
    const quantity = fields.getByRole('combobox', { name: 'Sold as' });
    const save = fields.getByRole('button', { name: 'Save' });
    const before = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(table, add)).toBe(true);
    expect(before(add, quantity)).toBe(true);
    expect(before(quantity, save)).toBe(true);
    expect(screen.queryByRole('heading', { level: 3, name: 'Options' })).not.toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Options' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Models' })).not.toBeInTheDocument();
  });

  it('keeps the long help in a closed disclosure, "How this works", and the Main input item keeps the id the tick boxes point at', async () => {
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    expect(fields.getByText('What the buyer fills in when ordering, in this order.')).toBeInTheDocument();
    const summary = fields.getByText('How this works');
    const details = summary.closest('details') as HTMLDetailsElement;
    expect(summary.tagName).toBe('SUMMARY');
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    // The list of the help is inside the disclosure (a closed one keeps it in the page), and the Main input item is the one the boxes name.
    const list = within(details).getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => item.textContent?.split(':')[0])).toEqual([
      'Name',
      'Label',
      'Type "IMEI (15 digits)"',
      'Type "IMEI list (one per line, up to 30)"',
      'Type "IMEISV (16 digits)"',
      'Type "Serial number"',
      'Type "ICCID (SIM number)"',
      'Type "EID (eSIM, 32 digits)"',
      'Type "MEID"',
      'Type "ECID"',
      'Type "MAC address"',
      'Type "Mi lock code"',
      'Type "Box serial number"',
      'Main input',
      'A pattern the supplier import gave a field is kept and not shown.',
    ]);
    const mainInput = items[13] as HTMLElement;
    expect(mainInput.id).not.toBe('');
    const tick = fields.getByRole('checkbox', { name: 'Main input of field 1' });
    expect(tick).toHaveAttribute('aria-describedby', mainInput.id);
    expect(document.getElementById(mainInput.id)).toBe(mainInput);
    // Opening it is the browser's own doing: the summary toggles it.
    await userEvent.click(summary);
    expect(details.open).toBe(true);
  });
});

describe('Field: the quantity', () => {
  it('shows how the service sells and saves a range', async () => {
    const user = userEvent.setup();
    await openFields(AT_T, 'imei');
    const quantity = section('Custom Fields');
    const way = quantity.getByRole('combobox', { name: 'Sold as' });
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
    const quantity = section('Custom Fields');
    await user.selectOptions(quantity.getByRole('combobox', { name: 'Sold as' }), 'Fixed packs');
    await user.type(quantity.getByRole('textbox', { name: 'Pack sizes' }), '25, 5, 10');
    await user.click(quantity.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Quantity saved')).toBeInTheDocument();
    expect(await getService(AT_T)).toMatchObject({ minQty: 5, maxQty: 25, qtyOptions: [5, 10, 25] });
  });

  it('checks the range in the browser, under the box it is about', async () => {
    const user = userEvent.setup();
    await openFields(AT_T, 'imei');
    const quantity = section('Custom Fields');
    await user.selectOptions(quantity.getByRole('combobox', { name: 'Sold as' }), 'A range');
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
    const quantity = section('Custom Fields');
    await user.selectOptions(quantity.getByRole('combobox', { name: 'Sold as' }), 'Fixed packs');
    await user.type(quantity.getByRole('textbox', { name: 'Pack sizes' }), ' ');
    await user.click(quantity.getByRole('button', { name: 'Save' }));
    expect(await quantity.findByText('Enter at least one pack size.')).toBeInTheDocument();
  });
});

// Decision 035: the Label column is hidden unless the box above the table is ticked; hidden, every row sends an empty label.
describe('Field: the Label column', () => {
  const SHOW = 'Show buyers a different label';

  /** A new IMEI service: its one field has the label IMEI, the same as its name, so the column starts hidden. */
  async function openMade(code: string) {
    await signInAs();
    const made = await createService({
      name: `Made ${code}`,
      code,
      categoryId: 1,
      type: 'imei',
      slaMinutes: 30,
      basePrice: '4.0000',
    });
    await openFields(made.id, 'imei');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    return { id: made.id, fields };
  }

  it('is hidden when every label is its name, with the tick box off, and the help says what the label is for', async () => {
    const { fields } = await openMade('IMEI-LBL-1');
    expect(fields.getByRole('checkbox', { name: SHOW })).not.toBeChecked();
    expect(fields.queryByRole('columnheader', { name: 'Label' })).not.toBeInTheDocument();
    expect(fields.queryByRole('textbox', { name: 'Label of field 1' })).not.toBeInTheDocument();
    expect(fields.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'No.',
      'Name',
      'Type',
      'Required',
      'Main input',
      'Actions',
    ]);
    // The box sits above the table.
    const box = fields.getByRole('checkbox', { name: SHOW });
    const table = fields.getByRole('table', { name: 'Custom fields' });
    expect(Boolean(box.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    const label = within(fields.getByText('How this works').closest('details') as HTMLElement)
      .getAllByRole('listitem')
      .find((item) => item.textContent?.startsWith('Label'));
    expect(label).toHaveTextContent(/Show buyers a different label/);
  });

  it('starts ticked, with the column drawn for every row, when a saved label differs from its name', async () => {
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    expect(fields.getByRole('checkbox', { name: SHOW })).toBeChecked();
    expect(fields.getByRole('columnheader', { name: 'Label' })).toBeInTheDocument();
    expect(fields.getByRole('textbox', { name: 'Label of field 1' })).toHaveValue('Z3X account');
  });

  it('draws the column for every row when the box is ticked, and hides it again when it is unticked', async () => {
    const user = userEvent.setup();
    const { fields } = await openMade('IMEI-LBL-2');
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.click(fields.getByRole('checkbox', { name: SHOW }));
    expect(fields.getByRole('textbox', { name: 'Label of field 1' })).toHaveValue('IMEI');
    expect(fields.getByRole('textbox', { name: 'Label of field 2' })).toHaveValue('');
    expect(fields.getByRole('textbox', { name: 'Label of field 2' })).toHaveAttribute(
      'placeholder',
      'Same as the name',
    );
    await user.click(fields.getByRole('checkbox', { name: SHOW }));
    expect(fields.queryByRole('textbox', { name: 'Label of field 1' })).not.toBeInTheDocument();
  });

  it('sends an empty label for every row while it is hidden, so a renamed field is renamed for buyers too', async () => {
    const user = userEvent.setup();
    const { id, fields } = await openMade('IMEI-LBL-3');
    const requests = recordRequests();
    const name = fields.getByRole('textbox', { name: 'Name of field 1' });
    await user.clear(name);
    await user.type(name, 'Handset IMEI');
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 2' }), 'Plan');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    const put = requests.sent().filter((request) => request.method === 'PUT');
    expect(put).toHaveLength(1);
    expect(put[0]?.body).toMatchObject({
      fields: [
        { name: 'Handset IMEI', label: '' },
        { name: 'Plan', label: '' },
      ],
    });
    // The server stored each name as its label, so the label followed the rename.
    expect((await getService(id)).fields.map((field) => [field.name, field.label])).toEqual([
      ['Handset IMEI', 'Handset IMEI'],
      ['Plan', 'Plan'],
    ]);
    expect(fields.queryByRole('textbox', { name: 'Label of field 1' })).not.toBeInTheDocument();
  });

  it('sends what is typed while it is shown', async () => {
    const user = userEvent.setup();
    const { id, fields } = await openMade('IMEI-LBL-4');
    const requests = recordRequests();
    await user.click(fields.getByRole('checkbox', { name: SHOW }));
    await user.clear(fields.getByRole('textbox', { name: 'Label of field 1' }));
    await user.type(fields.getByRole('textbox', { name: 'Label of field 1' }), '  Phone IMEI ');
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 2' }), 'Plan');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    const put = requests.sent().filter((request) => request.method === 'PUT');
    expect(put[0]?.body).toMatchObject({
      fields: [
        { name: 'IMEI', label: 'Phone IMEI' },
        { name: 'Plan', label: '' },
      ],
    });
    expect((await getService(id)).fields.map((field) => field.label)).toEqual(['Phone IMEI', 'Plan']);
    // The box stays ticked after the save: a label that differs is on show.
    expect(fields.getByRole('checkbox', { name: SHOW })).toBeChecked();
  });

  it('can be saved after unticking the box on its own: the labels that differed go back to the names', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    expect(fields.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.click(fields.getByRole('checkbox', { name: SHOW }));
    expect(fields.queryByRole('textbox', { name: 'Label of field 1' })).not.toBeInTheDocument();
    expect(fields.getByRole('button', { name: 'Save' })).toBeEnabled();
    const requests = recordRequests();
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect(requests.sent().filter((request) => request.method === 'PUT')[0]?.body).toMatchObject({
      fields: [{ key: 'account', name: 'user', label: '' }],
    });
    expect((await getService(Z3X)).fields).toMatchObject([{ key: 'account', name: 'user', label: 'user' }]);
    expect(await fields.findByText('Saved')).toBeInTheDocument();
    expect(fields.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('says under the box, before a save, that unticking it removes the different labels, and stops saying it once saved', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    const hint = "Saving now removes the different labels: buyers will see each field's name.";
    // Ticked: the labels are on show, nothing is about to be removed.
    expect(fields.queryByText(hint)).not.toBeInTheDocument();
    await user.click(fields.getByRole('checkbox', { name: SHOW }));
    expect(fields.getByText(hint)).toBeInTheDocument();
    expect(fields.getByRole('checkbox', { name: SHOW })).toHaveAccessibleDescription(hint);
    // Ticked again: the labels stay, so the line goes.
    await user.click(fields.getByRole('checkbox', { name: SHOW }));
    expect(fields.queryByText(hint)).not.toBeInTheDocument();
    await user.click(fields.getByRole('checkbox', { name: SHOW }));
    expect(fields.getByText(hint)).toBeInTheDocument();
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    // Saved: every label is now its name, so there is nothing left to warn about.
    expect(fields.queryByText(hint)).not.toBeInTheDocument();
  });

  it('says nothing about removing labels when every label is its name or empty', async () => {
    const user = userEvent.setup();
    const { fields } = await openMade('IMEI-LBL-6');
    const hint = "Saving now removes the different labels: buyers will see each field's name.";
    expect(fields.queryByText(hint)).not.toBeInTheDocument();
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 2' }), 'Plan');
    expect(fields.queryByText(hint)).not.toBeInTheDocument();
  });

  it('is forced on, and cannot be unticked, while a label cell holds a message of the server', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.put('*/admin/services/:id/fields', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'fields.0.label', message: 'That label is not allowed.' },
        ]),
      ),
    );
    const { fields } = await openMade('IMEI-LBL-5');
    expect(fields.queryByRole('textbox', { name: 'Label of field 1' })).not.toBeInTheDocument();
    const name = fields.getByRole('textbox', { name: 'Name of field 1' });
    await user.clear(name);
    await user.type(name, 'Handset IMEI');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await fields.findByText('That label is not allowed.')).toBeVisible();
    expect(fields.getByRole('textbox', { name: 'Label of field 1' })).toHaveAttribute('aria-invalid', 'true');
    const box = fields.getByRole('checkbox', { name: SHOW });
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
  });

  it('is off for a role that may only read, as every other box of the section is', async () => {
    await openFields(Z3X, 'server', { permissions: ['catalog:read'] });
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    const box = fields.getByRole('checkbox', { name: SHOW });
    expect(box).toBeDisabled();
    expect(box).toBeChecked();
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
      'Main input',
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
    ).toEqual(ALL_TYPE_LABELS);
    await user.type(fields.getByRole('textbox', { name: `Name of field ${count + 1}` }), 'Device IMEI');
    await user.selectOptions(menu, 'IMEI (15 digits)');
    expect(fields.queryByRole('textbox', { name: `Choices of field ${count + 1}` })).not.toBeInTheDocument();
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    const saved = (await getService(id)).fields;
    expect(saved[count]).toMatchObject({ name: 'Device IMEI', fieldType: 'imei', options: [] });
  });

  it.each([
    ['imei_bulk', 'IMEI list (one per line, up to 30)'],
    ['imeisv', 'IMEISV (16 digits)'],
    ['serial', 'Serial number'],
    ['iccid', 'ICCID (SIM number)'],
    ['eid', 'EID (eSIM, 32 digits)'],
    ['meid', 'MEID'],
    ['ecid', 'ECID'],
    ['mac_address', 'MAC address'],
    ['mi_lock_code', 'Mi lock code'],
    ['box_sn', 'Box serial number'],
  ])('saves a field of the %s type, keeps it after a reload and shows it as "%s"', async (type, label) => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('button', { name: 'Add a field' });
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    const count = (await getService(Z3X)).fields.length;
    await user.type(fields.getByRole('textbox', { name: `Name of field ${count + 1}` }), 'Device code');
    await user.selectOptions(fields.getByRole('combobox', { name: `Type of field ${count + 1}` }), label);
    expect(fields.queryByRole('textbox', { name: `Choices of field ${count + 1}` })).not.toBeInTheDocument();
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    const saved = (await getService(Z3X)).fields;
    expect(saved[count]).toMatchObject({ name: 'Device code', fieldType: type, options: [] });
    // The form shows the saved type again once the record is read.
    await waitFor(() =>
      expect(fields.getByRole('combobox', { name: `Type of field ${count + 1}` })).toHaveDisplayValue(label),
    );
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
      'The name Plan is used by an earlier field.',
      'Only one field can be the main input.',
    ]) {
      expect(fields.getByText(message)).toBeInTheDocument();
    }
    // The hidden key has no cell of its own: its message is under the row's name.
    expect(fields.getByRole('textbox', { name: 'Name of field 1' })).toHaveAttribute('aria-invalid', 'true');
    expect(fields.getByRole('combobox', { name: 'Type of field 1' })).toHaveAttribute('aria-invalid', 'true');
    // The name of row 2 and its main-input flag each keep their own message: the flag's is on its tick box, not under the name.
    expect(fields.getByRole('textbox', { name: 'Name of field 2' })).toHaveAttribute('aria-invalid', 'true');
    const flag = fields.getByRole('checkbox', { name: 'Main input of field 2' });
    expect(flag).toHaveAttribute('aria-invalid', 'true');
    expect(flag.closest('td')).toHaveTextContent('Only one field can be the main input.');
    expect(fields.getByRole('textbox', { name: 'Name of field 2' }).closest('td')).not.toHaveTextContent(
      'Only one field can be the main input.',
    );
    expect(fields.getByRole('checkbox', { name: 'Main input of field 1' })).not.toHaveAttribute(
      'aria-invalid',
    );
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
  it('has a Main input column after Required with one tick box per row, and no icon button or badge', async () => {
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    const headers = fields.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers.indexOf('Main input')).toBe(headers.indexOf('Required') + 1);
    const tick = fields.getByRole('checkbox', { name: 'Main input of field 1' });
    expect(tick).not.toBeChecked();
    expect(tick).toHaveClass('check');
    // The icon-only button and the blue badge are gone: nothing named like it is a button, and the only text that is just
    // "Main input" is the column header (the intro sentence is longer).
    expect(fields.queryByRole('button', { name: /Main input/ })).not.toBeInTheDocument();
    expect(fields.getAllByText('Main input')).toHaveLength(1);
    // The Actions column keeps up, down and remove, and nothing else.
    const actions = within(tick.closest('tr') as HTMLElement).getAllByRole('button');
    expect(actions.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Move field 1 up',
      'Move field 1 down',
      'Remove field 1',
    ]);
  });

  it('says what the main input is in the help list of the section, and every tick box points at that item', async () => {
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    const sentence = fields.getByText(
      /Main input: the one field the order is about \(IMEI, serial, ECID\); the supplier receives it as the IMEI and order lists show it\./,
    );
    expect(sentence.id).not.toBe('');
    await userEvent.click(fields.getByRole('button', { name: 'Add a field' }));
    for (const n of [1, 2]) {
      expect(fields.getByRole('checkbox', { name: `Main input of field ${n}` })).toHaveAttribute(
        'aria-describedby',
        sentence.id,
      );
    }
    expect(fields.getByRole('checkbox', { name: 'Main input of field 1' })).toHaveAccessibleDescription(
      /Main input: the one field the order is about/,
    );
  });

  it('ticks one row and unticks the other, and saves the flag', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 2' }), 'Serial');
    const first = fields.getByRole('checkbox', { name: 'Main input of field 1' });
    const second = fields.getByRole('checkbox', { name: 'Main input of field 2' });

    await user.click(first);
    expect(first).toBeChecked();
    expect(second).not.toBeChecked();
    await user.click(second);
    expect(first).not.toBeChecked();
    expect(second).toBeChecked();

    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect((await getService(Z3X)).fields.map((field) => [field.key, field.isMainInput])).toEqual([
      ['account', false],
      ['serial', true],
    ]);
    expect(fields.getByRole('checkbox', { name: 'Main input of field 2' })).toBeChecked();
    expect(fields.getByRole('checkbox', { name: 'Main input of field 1' })).not.toBeChecked();
  });

  it('unticks it again, which leaves the service with none and marks the section as changed only while it differs', async () => {
    const user = userEvent.setup();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    const save = fields.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    const first = fields.getByRole('checkbox', { name: 'Main input of field 1' });
    await user.click(first);
    expect(save).toBeEnabled();
    await user.click(first);
    expect(first).not.toBeChecked();
    expect(save).toBeDisabled();
  });

  it('saves a service with no main input after the last one is unticked', async () => {
    const user = userEvent.setup();
    const service = (await servicesStore()).services.find(String(Z3X));
    if (!service?.fields[0]) throw new Error('The seed has no field on the Z3X service.');
    service.fields[0].isMainInput = true;
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    const first = await fields.findByRole('checkbox', { name: 'Main input of field 1' });
    expect(first).toBeChecked();
    await user.click(first);
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect((await getService(Z3X)).fields.map((field) => field.isMainInput)).toEqual([false]);
  });
});

// The shop's order form draws only the service's custom fields (decision 029); an IMEI service forces nothing (decision 031), so the
// warning is only advice to mark the field the order is about.
describe('Field: the main input warning', () => {
  const WARNING =
    'No field is marked Main input. Mark the field the order is about (the IMEI, a serial, an ECID) so the supplier receives it.';

  it('says so on an IMEI service with no fields, and follows the main input tick box of the draft', async () => {
    const user = userEvent.setup();
    await openFields(AT_T, 'imei');
    const fields = section('Custom Fields');
    expect(await fields.findByText(WARNING)).toBeInTheDocument();
    expect(fields.getByText(/No custom fields\. The order form shows no input box/)).toBeInTheDocument();
    await user.click(fields.getByRole('button', { name: 'Add a field' }));
    await user.type(fields.getByRole('textbox', { name: 'Name of field 1' }), 'Serial');
    expect(fields.getByText(WARNING)).toBeInTheDocument();
    const main = fields.getByRole('checkbox', { name: 'Main input of field 1' });
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
    expect(fields.getByRole('checkbox', { name: 'Main input of field 1' })).not.toBeChecked();
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
    // Its label is its name, so the Label column is hidden (decision 035).
    expect(fields.queryByRole('textbox', { name: 'Label of field 1' })).not.toBeInTheDocument();
    expect(fields.getByRole('combobox', { name: 'Type of field 1' })).toHaveValue('imei');
    expect(fields.getByRole('checkbox', { name: 'Field 1 is required' })).toBeChecked();
    expect(fields.getByRole('checkbox', { name: 'Main input of field 1' })).toBeChecked();
    expect(fields.queryByText(WARNING)).not.toBeInTheDocument();
  });
});

// One Save, two routes (decision 032): it sends only the part that changed, the fields (PUT) first and then the quantity (PATCH), and a part
// that fails stays dirty with its message while the part that saved stays saved.
describe('Field: one Save for the fields and the quantity', () => {
  type Recorder = ReturnType<typeof recordRequests>;
  /** The writes the part sent, in order: "PUT fields" for the order fields and "PATCH quantity" for the quantity. */
  const writes = (requests: Recorder) =>
    requests
      .sent()
      .filter((request) => request.method === 'PUT' || request.method === 'PATCH')
      .map(
        (request) => `${request.method} ${request.url.pathname.endsWith('/fields') ? 'fields' : 'quantity'}`,
      );

  /** Opens the Z3X service (one per order, one field) and gives the section. */
  async function openZ3x() {
    const requests = recordRequests();
    await openFields(Z3X, 'server');
    const fields = section('Custom Fields');
    await fields.findByRole('textbox', { name: 'Name of field 1' });
    return { fields, requests, user: userEvent.setup() };
  }

  type Opened = Awaited<ReturnType<typeof openZ3x>>;
  const changeName = async ({ fields, user }: Opened, value = 'Account name') => {
    const name = fields.getByRole('textbox', { name: 'Name of field 1' });
    await user.clear(name);
    await user.type(name, value);
  };
  const changeQuantity = async ({ fields, user }: Opened, largest = '10') => {
    await user.selectOptions(fields.getByRole('combobox', { name: 'Sold as' }), 'A range');
    await user.type(fields.getByRole('textbox', { name: 'Largest' }), largest);
  };
  const failOnce = (method: 'put' | 'patch', path: string, field: string, message: string) =>
    mockServer.use(
      http[method](
        path,
        () =>
          problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
            { field, message },
          ]),
        { once: true },
      ),
    );

  it('sends one PATCH and no PUT when only the quantity changed', async () => {
    const page = await openZ3x();
    const { fields, requests, user } = page;
    await changeQuantity(page);
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Quantity saved')).toBeInTheDocument();
    expect(writes(requests)).toEqual(['PATCH quantity']);
    expect(requests.sent().find((request) => request.method === 'PATCH')?.body).toMatchObject({
      minQty: 1,
      maxQty: 10,
      qtyOptions: [],
    });
    expect(screen.queryByText('Fields saved')).not.toBeInTheDocument();
    expect(await fields.findByText('Saved')).toBeInTheDocument();
    expect(fields.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('sends one PUT and no PATCH when only the fields changed', async () => {
    const page = await openZ3x();
    const { fields, requests, user } = page;
    await changeName(page);
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect(writes(requests)).toEqual(['PUT fields']);
    expect(screen.queryByText('Quantity saved')).not.toBeInTheDocument();
    expect(await fields.findByText('Saved')).toBeInTheDocument();
    expect(fields.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('sends both, the fields first, when both changed, and leaves the section clean', async () => {
    const page = await openZ3x();
    const { fields, requests, user } = page;
    await changeName(page);
    await changeQuantity(page);
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Quantity saved')).toBeInTheDocument();
    expect(screen.getByText('Fields saved')).toBeInTheDocument();
    expect(writes(requests)).toEqual(['PUT fields', 'PATCH quantity']);
    expect(await getService(Z3X)).toMatchObject({
      minQty: 1,
      maxQty: 10,
      fields: [{ key: 'account', name: 'Account name' }],
    });
    expect(await fields.findByText('Saved')).toBeInTheDocument();
    expect(fields.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('keeps the fields saved and clean, and the quantity dirty with its message, when the PATCH fails after the PUT', async () => {
    failOnce('patch', '*/admin/services/:id', 'maxQty', 'The supplier sells at most 5 per order.');
    const page = await openZ3x();
    const { fields, requests, user } = page;
    await changeName(page);
    await changeQuantity(page);
    await user.click(fields.getByRole('button', { name: 'Save' }));

    expect(await fields.findByText('The supplier sells at most 5 per order.')).toBeInTheDocument();
    expect(screen.getByText('Fields saved')).toBeInTheDocument();
    expect(screen.queryByText('Quantity saved')).not.toBeInTheDocument();
    expect(writes(requests)).toEqual(['PUT fields', 'PATCH quantity']);
    expect(fields.getByRole('textbox', { name: 'Largest' })).toHaveAttribute('aria-invalid', 'true');
    expect(fields.queryByText('Saved')).not.toBeInTheDocument();
    expect((await getService(Z3X)).fields[0]).toMatchObject({ name: 'Account name' });
    expect(await getService(Z3X)).toMatchObject({ minQty: 1, maxQty: 1 });
    // The quantity is still unsaved and Save is on; the fields are clean, so the next press sends the PATCH alone.
    const save = fields.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();
    await user.click(save);
    expect(await screen.findByText('Quantity saved')).toBeInTheDocument();
    expect(writes(requests)).toEqual(['PUT fields', 'PATCH quantity', 'PATCH quantity']);
    expect(await getService(Z3X)).toMatchObject({ minQty: 1, maxQty: 10 });
    expect(await fields.findByText('Saved')).toBeInTheDocument();
    expect(save).toBeDisabled();
  });

  it('keeps the quantity saved and clean, and the fields dirty with their message, when the PUT fails', async () => {
    failOnce('put', '*/admin/services/:id/fields', 'fields.0.fieldType', 'That type is not offered.');
    const page = await openZ3x();
    const { fields, requests, user } = page;
    await changeName(page);
    await changeQuantity(page);
    await user.click(fields.getByRole('button', { name: 'Save' }));

    expect(await fields.findByText('That type is not offered.')).toBeInTheDocument();
    expect(screen.getByText('Quantity saved')).toBeInTheDocument();
    expect(screen.queryByText('Fields saved')).not.toBeInTheDocument();
    expect(writes(requests)).toEqual(['PUT fields', 'PATCH quantity']);
    expect(fields.getByRole('combobox', { name: 'Type of field 1' })).toHaveAttribute('aria-invalid', 'true');
    expect(await getService(Z3X)).toMatchObject({ minQty: 1, maxQty: 10, fields: [{ name: 'user' }] });
    const save = fields.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();
    await user.click(save);
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect(writes(requests)).toEqual(['PUT fields', 'PATCH quantity', 'PUT fields']);
    // The reset that the quantity's save made did not wipe the edits of the fields: the retried PUT still carries the edited name.
    const puts = requests.sent().filter((request) => request.method === 'PUT');
    expect(puts[1]?.body).toMatchObject({ fields: [{ key: 'account', name: 'Account name' }] });
    expect((await getService(Z3X)).fields[0]).toMatchObject({ name: 'Account name' });
    expect(fields.getByRole('textbox', { name: 'Name of field 1' })).toHaveValue('Account name');
    expect(save).toBeDisabled();
  });

  it('does not let a mistake in the quantity box hold back the fields, and sends no PATCH for it', async () => {
    const page = await openZ3x();
    const { fields, requests, user } = page;
    await changeName(page);
    await user.selectOptions(fields.getByRole('combobox', { name: 'Sold as' }), 'A range');
    const smallest = fields.getByRole('textbox', { name: 'Smallest' });
    await user.clear(smallest);
    await user.type(smallest, '5');
    await user.type(fields.getByRole('textbox', { name: 'Largest' }), '3');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(
      await fields.findByText('The largest quantity cannot be below the smallest (5).'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect(writes(requests)).toEqual(['PUT fields']);
    expect((await getService(Z3X)).fields[0]).toMatchObject({ name: 'Account name' });
    // The quantity boxes keep what was typed, and Save stays on for them.
    expect(fields.getByRole('textbox', { name: 'Smallest' })).toHaveValue('5');
    expect(fields.getByRole('textbox', { name: 'Largest' })).toHaveValue('3');
    expect(fields.getByRole('textbox', { name: 'Name of field 1' })).toHaveValue('Account name');
    const save = fields.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();
    // The fields are clean: the next press tries the quantity alone, sends nothing and says why again.
    await user.click(save);
    await waitFor(() =>
      expect(fields.getByRole('textbox', { name: 'Largest' })).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(writes(requests)).toEqual(['PUT fields']);
    expect(fields.getByRole('textbox', { name: 'Smallest' })).toHaveValue('5');
    expect(fields.getByRole('textbox', { name: 'Largest' })).toHaveValue('3');
  });

  it('says "Nothing changed" and sends nothing when the quantity is typed back to the saved rule', async () => {
    const page = await openZ3x();
    const { fields, requests, user } = page;
    await changeQuantity(page, '1');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(writes(requests)).toEqual([]);
    expect(fields.getByRole('combobox', { name: 'Sold as' })).toHaveValue('single');
    expect(fields.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(fields.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('saves the fields without a word about the quantity when the quantity is the saved rule', async () => {
    const page = await openZ3x();
    const { fields, requests, user } = page;
    await changeName(page);
    await changeQuantity(page, '1');
    await user.click(fields.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fields saved')).toBeInTheDocument();
    expect(await fields.findByText('Saved')).toBeInTheDocument();
    expect(writes(requests)).toEqual(['PUT fields']);
    expect(screen.queryByText('Nothing changed')).not.toBeInTheDocument();
    expect(fields.getByRole('combobox', { name: 'Sold as' })).toHaveValue('single');
    expect(fields.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  describe('the question before unsaved changes are left', () => {
    const question = () => screen.findByRole('dialog', { name: 'Discard your unsaved changes?' });
    const overview = () =>
      within(screen.getByRole('navigation', { name: 'Parts' })).getByRole('link', { name: 'Overview' });

    it.each([
      ['the fields', changeName],
      ['the quantity', changeQuantity],
    ])(
      'is asked while only %s hold a change, and not once the one Save has sent it',
      async (_part, change) => {
        const page = await openZ3x();
        const { fields, user } = page;
        await change(page);
        await user.click(overview());
        const dialog = within(await question());
        expect(dialog.getByText(/You have unsaved changes in Field\./)).toBeInTheDocument();
        await user.click(dialog.getByRole('button', { name: 'Keep editing' }));

        await user.click(fields.getByRole('button', { name: 'Save' }));
        expect(await fields.findByText('Saved')).toBeInTheDocument();
        await user.click(overview());
        await waitFor(() =>
          expect(screen.queryByRole('form', { name: 'Custom Fields' })).not.toBeInTheDocument(),
        );
        expect(
          screen.queryByRole('dialog', { name: 'Discard your unsaved changes?' }),
        ).not.toBeInTheDocument();
      },
    );

    it('is still asked while the quantity stays unsaved after the fields saved', async () => {
      failOnce('patch', '*/admin/services/:id', 'maxQty', 'The supplier sells at most 5 per order.');
      const page = await openZ3x();
      const { fields, user } = page;
      await changeName(page);
      await changeQuantity(page);
      await user.click(fields.getByRole('button', { name: 'Save' }));
      await fields.findByText('The supplier sells at most 5 per order.');
      await user.click(overview());
      expect(await question()).toBeInTheDocument();
    });
  });
});

describe('Field: what a role may change', () => {
  it('shows every box off with the missing permission named for a role that may only read', async () => {
    await openFields(Z3X, 'server', { permissions: ['catalog:read'] });
    const title = 'You need the catalog:update permission';
    const fields = section('Custom Fields');
    const way = fields.getByRole('combobox', { name: 'Sold as' });
    expect(way).toBeDisabled();
    expect(way).toHaveAttribute('title', title);
    const name = await fields.findByRole('textbox', { name: 'Name of field 1' });
    expect(name).toBeDisabled();
    expect(name).toHaveAttribute('title', title);
    const main = fields.getByRole('checkbox', { name: 'Main input of field 1' });
    expect(main).toBeDisabled();
    expect(main).toHaveAttribute('title', title);
    expect(fields.getByRole('button', { name: 'Add a field' })).toBeDisabled();
    expect(fields.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
