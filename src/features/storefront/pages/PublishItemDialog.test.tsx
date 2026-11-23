// Tests for the dialog of one preview row: what it starts with, the PATCH that carries only the keys staff changed, a refusal under
// its field, the choice of the shop price and its lock without `storefront:update`, Reset to what was detected, and Save and next,
// which asks the SERVER for the next row (so it works when the saved row left the filter, at the end of a page and at the last row).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { roleStore } from '@/mocks/roles';
import { setupMockApi } from '@/test/renderApp';
import { lastOf, PUBLISH_PERMISSIONS, publishRoute } from '../test/publishPage';
import {
  codeOf,
  itemReads,
  itemWrites,
  openPreview,
  openRowDialog,
  PREVIEW,
  previewRow,
} from '../test/publishPreview';
import { recordRequests } from '../test/requests';
import { openProductsView } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 40_000 });
afterEach(() => vi.restoreAllMocks());

const WITHOUT_UPDATE = PUBLISH_PERMISSIONS.filter((permission) => permission !== 'storefront:update');

describe('what the dialog starts with', () => {
  it('shows the supplier’s name read only, the code, and the fields as the row has them', async () => {
    const user = userEvent.setup();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    expect(dialog.getByText('AT&amp;T USA Premier Unlock [Clean] 1-3 Days')).toHaveAttribute('dir', 'auto');
    expect(dialog.getByText('IMP-101 · imei · Carrier unlock')).toBeInTheDocument();
    expect(dialog.getByLabelText('Title')).toHaveValue('AT&T USA Premier Unlock');
    expect(dialog.getByLabelText('Address (slug)')).toHaveValue('atandt-usa-premier-unlock');
    expect(dialog.getByLabelText('Brand')).toHaveValue('Apple');
    expect(dialog.getByLabelText('Carrier')).toHaveValue('AT&T');
    expect(dialog.getByLabelText('Country')).toHaveValue('US');
    expect(dialog.getByText('Leave empty and the server makes it from the title.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(dialog.getByRole('button', { name: 'Save and next' })).toBeEnabled();
  });

  it('offers the rule’s price with the rule’s name, a typed price, and no "keep" for a service with no price', async () => {
    const user = userEvent.setup();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    const rule = dialog.getByRole('radio', { name: /^Use the pricing rule \(\$16\.99\)/ });
    expect(rule).toBeChecked();
    expect(dialog.getByText('Carrier unlock +20% +$0.50, up to 5 cents')).toBeInTheDocument();
    expect(dialog.getByRole('radio', { name: /^Type a price/ })).not.toBeChecked();
    expect(dialog.queryByRole('radio', { name: /^Keep the current price/ })).not.toBeInTheDocument();
    expect(dialog.queryByLabelText(/^Price shown to customers/)).not.toBeInTheDocument();
  });

  it('says which price the rule replaces, and offers to keep that price', async () => {
    const user = userEvent.setup();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(3));
    expect(dialog.getByText(/Replaces the current price of \$8\.49\./)).toBeInTheDocument();
    expect(dialog.getByRole('radio', { name: /^Keep the current price \(\$8\.49\)/ })).not.toBeChecked();
  });

  it('starts a typed price in the mono field with the floor as its hint', async () => {
    const user = userEvent.setup();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(4));
    expect(dialog.getByRole('radio', { name: /^Type a price/ })).toBeChecked();
    const field = dialog.getByLabelText('Price shown to customers (USD, before VAT)');
    expect(field).toHaveValue('9.99');
    expect(field).toHaveClass('mono');
    expect(dialog.getByText('Floor $8.39: the lowest price the server accepts.')).toBeInTheDocument();
  });

  it('turns the rule option off for a service no rule prices', async () => {
    const user = userEvent.setup();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(40));
    expect(dialog.getByRole('radio', { name: /^Use the pricing rule/ })).toBeDisabled();
    expect(dialog.getByText('No pricing rule gives this service a price.')).toBeInTheDocument();
    expect(dialog.getByRole('radio', { name: /^Type a price/ })).toBeEnabled();
  });

  it('closes with Cancel and sends nothing', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(itemWrites(requests, 'PATCH')).toHaveLength(0);
  });
});

describe('saving', () => {
  it('sends only the keys that changed, and the row shows the server’s answer', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    await user.clear(dialog.getByLabelText('Title'));
    await user.type(dialog.getByLabelText('Title'), 'AT&T Premier Unlock');
    await user.clear(dialog.getByLabelText('Country'));
    await user.type(dialog.getByLabelText('Country'), 'ca');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [patch] = itemWrites(requests, 'PATCH');
    expect(patch.url.pathname).toMatch(/\/admin\/publish-runs\/5\/items\/1$/);
    expect(patch.body).toEqual({ title: 'AT&T Premier Unlock', country: 'ca' });
    const row = await previewRow(codeOf(1));
    expect(await row.findByText('AT&T Premier Unlock')).toBeInTheDocument();
    expect(row.getByText('Apple · AT&T · CA')).toBeInTheDocument();
  });

  it('says "Nothing changed" and sends nothing when no field changed', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(itemWrites(requests, 'PATCH')).toHaveLength(0);
  });

  it('sends an emptied address as the empty text, so the server makes it from the title', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    await user.clear(dialog.getByLabelText('Address (slug)'));
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(itemWrites(requests, 'PATCH')).toHaveLength(1));
    expect(itemWrites(requests, 'PATCH')[0].body).toEqual({ slug: '' });
  });

  it('shows the server’s refusal of an address under its field, and keeps the dialog open', async () => {
    const user = userEvent.setup();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    await user.clear(dialog.getByLabelText('Address (slug)'));
    await user.type(dialog.getByLabelText('Address (slug)'), 'sprint-usa-unlock');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    const field = await dialog.findByLabelText('Address (slug)');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(dialog.getByText('That address is taken by another listing.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edit row' })).toBeInTheDocument();
  });

  it('shows a refusal of the title under the title, in the server’s words', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/publish-runs/:id/items/:itemId', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'title', message: 'Use 1 to 200 characters on one line.' },
        ]),
      ),
    );
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    await user.type(dialog.getByLabelText('Title'), ' Pro');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await dialog.findByText('Use 1 to 200 characters on one line.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog', { name: 'Edit row' })).toBeInTheDocument();
  });

  it('says in the dialog that the run is no longer a draft, and reads the run again', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    mockServer.use(
      http.patch('*/admin/publish-runs/:id/items/:itemId', () =>
        problem(409, 'CONFLICT', 'Not in the right state', 'This run is no longer a draft.'),
      ),
    );
    await openPreview();
    const runReads = () =>
      requests
        .sent()
        .filter((sent) => sent.method === 'GET' && /\/admin\/publish-runs\/5$/.test(sent.url.pathname))
        .length;
    const before = runReads();
    const dialog = await openRowDialog(user, codeOf(1));
    await user.type(dialog.getByLabelText('Brand'), 'x');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await dialog.findByText('This run is no longer a draft.')).toBeInTheDocument();
    await waitFor(() => expect(runReads()).toBeGreaterThan(before));
  });
});

describe('the shop price', () => {
  it('sends a typed price as four-decimal text, and the row then says Typed', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    await user.click(dialog.getByRole('radio', { name: /^Type a price/ }));
    await user.type(dialog.getByLabelText('Price shown to customers (USD, before VAT)'), '17.5');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(itemWrites(requests, 'PATCH')[0].body).toEqual({ retailPrice: '17.5000' });
    const row = await previewRow(codeOf(1));
    expect(await row.findByText('Typed')).toBeInTheDocument();
    expect(row.getByText('$17.50')).toBeInTheDocument();
  });

  it('asks for a price above zero before it sends anything', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    await user.click(dialog.getByRole('radio', { name: /^Type a price/ }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await dialog.findByText('Enter a price greater than zero.')).toBeInTheDocument();
    expect(itemWrites(requests, 'PATCH')).toHaveLength(0);
  });

  it('shows the floor’s refusal under the price field in the server’s words', async () => {
    const user = userEvent.setup();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    await user.click(dialog.getByRole('radio', { name: /^Type a price/ }));
    await user.type(dialog.getByLabelText('Price shown to customers (USD, before VAT)'), '10');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await dialog.findByText('Below the storefront floor of $15.74.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edit row' })).toBeInTheDocument();
  });

  it('keeps the current price with `pricing: keep`, and the row says Kept without "replaces"', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(3));
    await user.click(dialog.getByRole('radio', { name: /^Keep the current price/ }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(itemWrites(requests, 'PATCH')[0].body).toEqual({ pricing: 'keep' });
    const row = await previewRow(codeOf(3));
    expect(await row.findByText('Kept')).toBeInTheDocument();
    expect(row.queryByText(/^replaces/)).not.toBeInTheDocument();
  });

  it('chooses the rule over a typed price with `pricing: rule`', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(4));
    await user.click(dialog.getByRole('radio', { name: /^Use the pricing rule/ }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(itemWrites(requests, 'PATCH')[0].body).toEqual({ pricing: 'rule' });
    expect(await (await previewRow(codeOf(4))).findByText('Rule')).toBeInTheDocument();
  });
});

describe('without the permission to change a price', () => {
  it('locks the price group with the permission named, and sends no price key with the other changes', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview({ permissions: WITHOUT_UPDATE });
    const dialog = await openRowDialog(user, codeOf(1));
    for (const radio of dialog.getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(dialog.getAllByText('You need the storefront:update permission.').length).toBeGreaterThan(0);
    expect(dialog.getByRole('radio', { name: /^Type a price/ })).toHaveAttribute(
      'title',
      'You need the storefront:update permission',
    );
    // The facts can still be changed.
    await user.type(dialog.getByLabelText('Brand'), 'x');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(itemWrites(requests, 'PATCH')[0].body).toEqual({ brand: 'Applex' });
  });

  it('locks the typed price too, and leaves the whole row as it is when only the price group was touched', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview({ permissions: WITHOUT_UPDATE });
    const dialog = await openRowDialog(user, codeOf(4));
    expect(dialog.getByLabelText('Price shown to customers (USD, before VAT)')).toBeDisabled();
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(itemWrites(requests, 'PATCH')).toHaveLength(0);
  });

  it('shows the server’s 403 in the dialog when a price key is refused to a role the page still thought could change prices', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    // The page was opened with `storefront:update`; the mock server reads the signed-in role, which lost it since.
    await openPreview();
    roleStore().patch(1, { permissions: WITHOUT_UPDATE });
    const dialog = await openRowDialog(user, codeOf(1));
    await user.click(dialog.getByRole('radio', { name: /^Type a price/ }));
    await user.type(dialog.getByLabelText('Price shown to customers (USD, before VAT)'), '17.5');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await dialog.findByText('You need the storefront:update permission.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edit row' })).toBeInTheDocument();
    expect(itemWrites(requests, 'PATCH')[0].body).toEqual({ retailPrice: '17.5000' });
    // A change with no price key still goes through for the same role, and the row never got the typed price.
    await user.click(dialog.getByRole('radio', { name: /^Use the pricing rule/ }));
    await user.type(dialog.getByLabelText('Brand'), 'x');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(itemWrites(requests, 'PATCH')[1].body).toEqual({ brand: 'Applex' });
    expect((await previewRow(codeOf(1))).queryByText('Typed')).not.toBeInTheDocument();
  });

  it('leaves the group open for a role that has the permission', async () => {
    const user = userEvent.setup();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    expect(dialog.getByRole('radio', { name: /^Type a price/ })).toBeEnabled();
    expect(dialog.queryByText(/permission/)).not.toBeInTheDocument();
  });
});

describe('Reset to what was detected', () => {
  it('is off for a row nobody edited', async () => {
    const user = userEvent.setup();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    expect(dialog.getByRole('button', { name: 'Reset to what was detected' })).toBeDisabled();
  });

  it('sends `reset` alone and shows the detected values again', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const first = await openRowDialog(user, codeOf(1));
    await user.clear(first.getByLabelText('Brand'));
    await user.type(first.getByLabelText('Brand'), 'Nokia');
    await user.click(first.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const dialog = await openRowDialog(user, codeOf(1));
    expect(dialog.getByLabelText('Brand')).toHaveValue('Nokia');
    await user.click(dialog.getByRole('button', { name: 'Reset to what was detected' }));
    await waitFor(() => expect(dialog.getByLabelText('Brand')).toHaveValue('Apple'));
    expect(itemWrites(requests, 'PATCH')[1].body).toEqual({ reset: true });
    expect(dialog.getByRole('button', { name: 'Reset to what was detected' })).toBeDisabled();
  });
});

describe('Save and next', () => {
  it('saves the changed keys and shows the next row of the same filter, read from the server in the order of the rows', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openProductsView(`${publishRoute(5)}&state=review&sort=cost&dir=desc`);
    await screen.findByRole('table', { name: PREVIEW });
    const dialog = await openRowDialog(user, codeOf(21));
    await user.type(dialog.getByLabelText('Carrier'), 'X');
    await user.click(dialog.getByRole('button', { name: 'Save and next' }));
    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getByText('IMP-122 · imei · Apple')).toBeInTheDocument(),
    );
    expect(itemWrites(requests, 'PATCH')[0].body).toEqual({ carrier: 'X' });
    // The next row came from the server, after row 21, in id order, under the table's filter: never the table's own sort.
    const reads = itemReads(requests);
    const next = reads.find((read) => read.url.searchParams.get('afterId') === '21');
    expect(Object.fromEntries(next!.url.searchParams.entries())).toMatchObject({
      afterId: '21',
      state: 'review',
      _start: '0',
      _end: '1',
      _sort: 'id',
      _order: 'asc',
    });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(within(screen.getByRole('dialog')).getByLabelText('Carrier')).toHaveValue('');
  });

  it('sends nothing when the row was not changed, and still goes to the next one', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    await user.click(dialog.getByRole('button', { name: 'Save and next' }));
    await waitFor(() =>
      expect(
        within(screen.getByRole('dialog')).getByText('IMP-102 · imei · Carrier unlock'),
      ).toBeInTheDocument(),
    );
    expect(itemWrites(requests, 'PATCH')).toHaveLength(0);
  });

  it('still finds the next row when the saved row has left the filter', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openProductsView(`${publishRoute(5)}&state=blocked`);
    await screen.findByRole('table', { name: PREVIEW });
    // Row 38 cannot be published for want of a title; with a title it is no longer "Cannot publish".
    const dialog = await openRowDialog(user, codeOf(38));
    await user.type(dialog.getByLabelText('Title'), 'Unlock service');
    await user.click(dialog.getByRole('button', { name: 'Save and next' }));
    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getByText(/^IMP-139 /)).toBeInTheDocument(),
    );
    const reads = itemReads(requests);
    const next = reads.find((read) => read.url.searchParams.get('afterId') === '38');
    expect(next?.url.searchParams.get('state')).toBe('blocked');
    // The table behind has dropped the saved row: it is not in the "Cannot publish" list any more.
    await waitFor(() => expect(screen.getByText('18 rows')).toBeInTheDocument());
  });

  it('goes on to a row of the next page, which the table does not hold', async () => {
    const user = userEvent.setup();
    await openPreview();
    const row = (await screen.findAllByText('Chimera Tool 1 Month'))[0].closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /^Edit / }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit row' }));
    await user.click(dialog.getByRole('button', { name: 'Save and next' }));
    // Row 51 is the first row of page 2.
    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getByLabelText('Title')).toHaveValue(
        'NCK Dongle Credits x50',
      ),
    );
  });

  it('says "That was the last one." and closes the dialog at the last row', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openProductsView(`${publishRoute(5)}&page=2`);
    const row = (await screen.findAllByText('Huawei update.app Firmware'))[0].closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /^Edit / }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit row' }));
    await user.click(dialog.getByRole('button', { name: 'Save and next' }));
    expect(await screen.findByText('That was the last one.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const next = itemReads(requests).find((read) => read.url.searchParams.get('afterId') === '60');
    expect(next).toBeDefined();
  });

  it('keeps the dialog on the row and asks for no next row when the save is refused', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openRowDialog(user, codeOf(1));
    await user.clear(dialog.getByLabelText('Address (slug)'));
    await user.type(dialog.getByLabelText('Address (slug)'), 'sprint-usa-unlock');
    await user.click(dialog.getByRole('button', { name: 'Save and next' }));
    expect(await dialog.findByText('That address is taken by another listing.')).toBeInTheDocument();
    expect(dialog.getByText('IMP-101 · imei · Carrier unlock')).toBeInTheDocument();
    expect(itemReads(requests).some((read) => read.url.searchParams.has('afterId'))).toBe(false);
    // The next click of Save after a failed Save and next is a plain Save: it must not walk on.
    await user.clear(dialog.getByLabelText('Address (slug)'));
    await user.type(dialog.getByLabelText('Address (slug)'), 'att-premier');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(itemReads(requests).some((read) => read.url.searchParams.has('afterId'))).toBe(false);
    expect(lastOf(requests, 'PATCH').body).toEqual({ slug: 'att-premier' });
  });
});
