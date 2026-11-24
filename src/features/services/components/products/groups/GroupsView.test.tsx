// Tests for the Group view, run through the whole app against the dev mock API: the list of the kind on the strip (status squares, ranks, service
// counts, the edit link), its page and size in the address, the status square, the up and down buttons (a swap, and across a page), the
// "With selected" strip (Activate, Deactivate, Delete with the server's refusal for a group that services still use) and a role that may only read.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { listCategories } from '../../../api';
import { groupHandlers } from '../../../mocks/testGroups';
import { dialogOf, openProducts } from '../../../test/productsPage';
import { recordRequests } from '../../../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
// The merchants feature serves the rank list; these tests bring their own copy of it.
beforeEach(() => mockServer.use(...groupHandlers));
afterEach(() => vi.restoreAllMocks());

// The IMEI kind holds five groups, in this order; the Server kind holds Credits and Licenses.
const IMEI_GROUPS = ['Apple', 'Samsung', 'Generic', 'Carrier unlock', 'Xiaomi'];
const GROUPS = '/products?view=groups';
const SERVER_GROUPS = '/products?view=groups&type=server';

/** The table of groups, once the list has loaded. */
async function groupTable() {
  return within(await screen.findByRole('table', { name: 'Service groups' }, { timeout: 10_000 }));
}

/** The names in the table, in order. */
async function groupNames() {
  const table = await groupTable();
  return table
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1].textContent);
}

/** The row of the group with this name. */
async function groupRow(name: string) {
  const table = await groupTable();
  return within((await table.findByText(name)).closest('tr') as HTMLElement);
}

/** The groups the server holds now, by name. */
async function stored(name: string) {
  const found = (await listCategories()).data.find((category) => category.name === name);
  if (!found) throw new Error(`No group is named "${name}".`);
  return found;
}

describe('the list', () => {
  it('lists the groups of the kind on the strip, in their order', async () => {
    await openProducts(GROUPS);
    await waitFor(async () => expect(await groupNames()).toEqual(IMEI_GROUPS));
    const headers = (await groupTable()).getAllByRole('columnheader').map((header) => header.textContent);
    // The first header holds the select-all box and has no text.
    expect(headers).toEqual(['', 'Group Name', 'Order', 'Status', 'Visible to', 'Services', 'Actions']);
  });

  it('shows the status, who sees the group, how many services it holds and a link to its edit view', async () => {
    await openProducts(GROUPS);
    const row = await groupRow('Carrier unlock');
    expect(row.getByRole('button', { name: 'Active: Carrier unlock' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(row.getByText('All')).toBeInTheDocument();
    expect(row.getByText('6')).toBeInTheDocument();
    expect(row.getByRole('link', { name: 'Edit Carrier unlock' }).getAttribute('href')).toMatch(
      /^\/products\?view=edit-group&type=imei&id=\d+$/,
    );
  });

  it('lists the groups of the kind on the strip only', async () => {
    await openProducts(SERVER_GROUPS);
    await waitFor(async () => expect(await groupNames()).toEqual(['Credits', 'Licenses']));
    expect(screen.queryByText('Carrier unlock')).not.toBeInTheDocument();
  });

  it('says so, with a way to add one, when the kind holds no group', async () => {
    mockServer.use(
      http.get('*/admin/service-categories', () =>
        HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
      ),
    );
    await openProducts(GROUPS);
    expect(
      await screen.findByRole('heading', { level: 3, name: 'No groups in this kind yet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add a group' })).toHaveAttribute(
      'href',
      '/products?view=add-group&type=imei',
    );
    expect(screen.queryByRole('group', { name: /^With selected/ })).not.toBeInTheDocument();
  });

  it('offers no way to add one to a role that may not create groups', async () => {
    mockServer.use(
      http.get('*/admin/service-categories', () =>
        HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
      ),
    );
    await openProducts(GROUPS, { permissions: ['catalog:read'] });
    expect(
      await screen.findByRole('heading', { level: 3, name: 'No groups in this kind yet' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add a group' })).not.toBeInTheDocument();
  });

  it('says so, with a Retry, when the groups could not be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get(
        '*/admin/service-categories',
        () => problem(403, 'FORBIDDEN', 'No access', 'Groups are closed.'),
        {
          once: true,
        },
      ),
    );
    await openProducts(GROUPS);
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Could not load the groups' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Groups are closed.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(async () => expect(await groupNames()).toEqual(IMEI_GROUPS));
  });
});

describe('the footer', () => {
  it('pages the groups of the kind, with the page and the size in the address', async () => {
    const user = userEvent.setup();
    const app = await openProducts(`${GROUPS}&size=2`);
    await waitFor(async () => expect(await groupNames()).toEqual(['Apple', 'Samsung']));
    expect(screen.getByText('Results: 1 - 2 of 5')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(app.location()).toBe('/products?view=groups&type=imei&page=2&size=2'));
    await waitFor(async () => expect(await groupNames()).toEqual(['Generic', 'Carrier unlock']));
    expect(screen.getByText('Results: 3 - 4 of 5')).toBeInTheDocument();
  });

  it('starts again at the first page for a new size, and leaves the default size out of the address', async () => {
    const user = userEvent.setup();
    const app = await openProducts(`${GROUPS}&size=2&page=3`);
    await waitFor(async () => expect(await groupNames()).toEqual(['Xiaomi']));
    await user.selectOptions(screen.getByRole('combobox', { name: /Page size/ }), '50');
    await waitFor(() => expect(app.location()).toBe('/products?view=groups&type=imei'));
    await waitFor(async () => expect(await groupNames()).toEqual(IMEI_GROUPS));
  });

  it('moves a page past the end back to the last page', async () => {
    const app = await openProducts(`${GROUPS}&size=2&page=9`);
    await waitFor(() => expect(app.location()).toBe('/products?view=groups&type=imei&page=3&size=2'));
    await waitFor(async () => expect(await groupNames()).toEqual(['Xiaomi']));
  });

  it('drops the ticks when another page opens', async () => {
    const user = userEvent.setup();
    await openProducts(`${GROUPS}&size=2`);
    await user.click((await groupRow('Apple')).getByRole('checkbox'));
    expect(screen.getByRole('group', { name: 'With selected (1):' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByRole('group', { name: 'With selected:' })).toBeInTheDocument();
  });
});

describe('the status square', () => {
  it('switches a group off and on again', async () => {
    const user = userEvent.setup();
    await openProducts(GROUPS);
    await user.click((await groupRow('Xiaomi')).getByRole('button', { name: 'Active: Xiaomi' }));
    expect(await screen.findByText('Xiaomi deactivated')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await groupRow('Xiaomi')).getByRole('button', { name: 'Active: Xiaomi' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    );
    expect((await stored('Xiaomi')).isActive).toBe(false);
    await user.click((await groupRow('Xiaomi')).getByRole('button', { name: 'Active: Xiaomi' }));
    expect(await screen.findByText('Xiaomi activated')).toBeInTheDocument();
    expect((await stored('Xiaomi')).isActive).toBe(true);
  });

  it('shows the words of the server when it refuses', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/service-categories/:id', () =>
        problem(422, 'VALIDATION_FAILED', 'Cannot switch it off', 'Samsung is on a price list.'),
      ),
    );
    await openProducts(GROUPS);
    await user.click((await groupRow('Samsung')).getByRole('button', { name: 'Active: Samsung' }));
    expect(await screen.findByText('Cannot switch it off')).toBeInTheDocument();
    expect(screen.getByText(/Samsung is on a price list\./)).toBeInTheDocument();
    expect((await groupRow('Samsung')).getByRole('button', { name: 'Active: Samsung' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('the order buttons', () => {
  it('moves a group up by swapping the places of two neighbours', async () => {
    const user = userEvent.setup();
    await openProducts(GROUPS);
    await user.click((await groupRow('Samsung')).getByRole('button', { name: 'Move Samsung up' }));
    await waitFor(async () =>
      expect(await groupNames()).toEqual(['Samsung', 'Apple', 'Generic', 'Carrier unlock', 'Xiaomi']),
    );
    expect((await stored('Samsung')).sort).toBeLessThan((await stored('Apple')).sort);
  });

  it('moves a group down', async () => {
    const user = userEvent.setup();
    await openProducts(GROUPS);
    await user.click((await groupRow('Generic')).getByRole('button', { name: 'Move Generic down' }));
    await waitFor(async () =>
      expect(await groupNames()).toEqual(['Apple', 'Samsung', 'Carrier unlock', 'Generic', 'Xiaomi']),
    );
  });

  it('sends one position per group that changes, and nothing else', async () => {
    const user = userEvent.setup();
    await openProducts(GROUPS);
    const requests = recordRequests();
    await user.click((await groupRow('Samsung')).getByRole('button', { name: 'Move Samsung up' }));
    await waitFor(() =>
      expect(requests.sent().filter((request) => request.method === 'PATCH')).toHaveLength(2),
    );
    const bodies = requests
      .sent()
      .filter((request) => request.method === 'PATCH')
      .map((request) => request.body);
    expect(bodies.every((body) => Object.keys(body as object).join() === 'sort')).toBe(true);
  });

  it('cannot move the first group up or the last group down', async () => {
    await openProducts(GROUPS);
    expect((await groupRow('Apple')).getByRole('button', { name: 'Move Apple up' })).toBeDisabled();
    expect((await groupRow('Apple')).getByRole('button', { name: 'Move Apple down' })).toBeEnabled();
    expect((await groupRow('Xiaomi')).getByRole('button', { name: 'Move Xiaomi down' })).toBeDisabled();
  });

  it('moves a group across a page: the first of the second page can go up', async () => {
    const user = userEvent.setup();
    await openProducts(`${GROUPS}&size=2&page=2`);
    const button = (await groupRow('Generic')).getByRole('button', { name: 'Move Generic up' });
    expect(button).toBeEnabled();
    await user.click(button);
    // Generic is now second, so the second page holds Samsung and Carrier unlock.
    await waitFor(async () => expect(await groupNames()).toEqual(['Samsung', 'Carrier unlock']));
    expect((await stored('Generic')).sort).toBeLessThan((await stored('Samsung')).sort);
  });

  it('shows the words of the server when a move is refused, and the list as the server holds it', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/service-categories/:id', () =>
        problem(403, 'FORBIDDEN', 'No access', 'Positions are locked.'),
      ),
    );
    await openProducts(GROUPS);
    await user.click((await groupRow('Samsung')).getByRole('button', { name: 'Move Samsung up' }));
    expect(await screen.findByText('No access')).toBeInTheDocument();
    expect(await groupNames()).toEqual(IMEI_GROUPS);
  });
});

describe('with selected', () => {
  it('ticks every group on the page with Check All and clears them with Uncheck All', async () => {
    const user = userEvent.setup();
    await openProducts(GROUPS);
    await groupTable();
    await user.click(screen.getByRole('button', { name: 'Check All' }));
    expect(screen.getByRole('group', { name: 'With selected (5):' })).toBeInTheDocument();
    for (const name of IMEI_GROUPS) {
      expect((await groupRow(name)).getByRole('checkbox')).toBeChecked();
    }
    await user.click(screen.getByRole('button', { name: 'Uncheck All' }));
    expect(screen.getByRole('group', { name: 'With selected:' })).toBeInTheDocument();
  });

  it('keeps the buttons off until a group is ticked', async () => {
    await openProducts(GROUPS);
    await groupTable();
    for (const name of ['Activate', 'Deactivate', 'Delete']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });

  it('deactivates the ticked groups, and activates them again', async () => {
    const user = userEvent.setup();
    await openProducts(GROUPS);
    await user.click((await groupRow('Samsung')).getByRole('checkbox'));
    await user.click((await groupRow('Xiaomi')).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(await screen.findByText('2 groups deactivated')).toBeInTheDocument();
    await waitFor(async () => {
      for (const name of ['Samsung', 'Xiaomi']) {
        expect((await groupRow(name)).getByRole('button', { name: `Active: ${name}` })).toHaveAttribute(
          'aria-pressed',
          'false',
        );
      }
    });
    // The ticks are cleared after an action.
    expect(await screen.findByRole('group', { name: 'With selected:' })).toBeInTheDocument();
    await user.click((await groupRow('Xiaomi')).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Activate' }));
    expect(await screen.findByText('1 group activated')).toBeInTheDocument();
    expect((await stored('Xiaomi')).isActive).toBe(true);
    expect((await stored('Samsung')).isActive).toBe(false);
  });

  it('says so when none of the ticked groups needs the change', async () => {
    const user = userEvent.setup();
    await openProducts(GROUPS);
    await user.click((await groupRow('Apple')).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Activate' }));
    expect(await screen.findByText('Nothing to change')).toBeInTheDocument();
  });

  it('asks before it deletes, and keeps the groups when the question is cancelled', async () => {
    const user = userEvent.setup();
    await openProducts(GROUPS);
    await user.click((await groupRow('Xiaomi')).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = dialogOf('Delete Xiaomi?');
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(await groupNames()).toContain('Xiaomi');
  });

  it('deletes an empty group and tells the refusal for a group that services still use', async () => {
    const user = userEvent.setup();
    await openProducts('/products?view=add-group');
    await user.type(await screen.findByRole('textbox', { name: 'Group Name' }), 'Spare');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Spare created')).toBeInTheDocument();
    await user.click((await groupRow('Spare')).getByRole('checkbox'));
    await user.click((await groupRow('Apple')).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const question = dialogOf('Delete 2 groups?');
    expect(question.getByText('Spare')).toBeInTheDocument();
    expect(question.getByText('Apple')).toBeInTheDocument();
    await user.click(question.getByRole('button', { name: 'Delete groups' }));
    const summary = dialogOf('1 of 2 groups deleted');
    expect(
      await summary.findByText(/Apple still has 4 services\. Move them to another category first\./),
    ).toBeInTheDocument();
    // The summary has two: the header's X, then the footer's button.
    await user.click(summary.getAllByRole('button', { name: 'Close' }).at(-1) as HTMLElement);
    await waitFor(async () => expect(await groupNames()).toEqual(IMEI_GROUPS));
    expect((await listCategories()).data.some((category) => category.name === 'Spare')).toBe(false);
  });

  it('shows one toast and no summary when every ticked group is deleted', async () => {
    const user = userEvent.setup();
    await openProducts('/products?view=add-group');
    await user.type(await screen.findByRole('textbox', { name: 'Group Name' }), 'Spare');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click((await groupRow('Spare')).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(dialogOf('Delete Spare?').getByRole('button', { name: 'Delete group' }));
    expect(await screen.findByText('1 group deleted')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('lets a reader see the groups but not change them, and says what is missing', async () => {
    const user = userEvent.setup();
    await openProducts(GROUPS, { permissions: ['catalog:read'] });
    const row = await groupRow('Apple');
    const square = row.getByRole('button', { name: 'Active: Apple' });
    expect(square).toBeDisabled();
    expect(square).toHaveAttribute('title', 'You need the catalog:update permission');
    expect(row.getByRole('button', { name: 'Move Apple down' })).toBeDisabled();
    expect(row.getByRole('link', { name: 'Edit Apple' })).toBeInTheDocument();
    // Without groups:read the ranks cannot be named; this group has none, so it is still "All".
    expect(row.getByText('All')).toBeInTheDocument();
    await user.click(row.getByRole('checkbox'));
    for (const name of ['Activate', 'Deactivate']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
      expect(screen.getByRole('button', { name })).toHaveAttribute(
        'title',
        'You need the catalog:update permission',
      );
    }
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'title',
      'You need the catalog:delete permission',
    );
  });

  it('lets a role that may update but not delete switch groups and keeps Delete off', async () => {
    const user = userEvent.setup();
    await openProducts(GROUPS, { permissions: ['catalog:read', 'catalog:update'] });
    await user.click((await groupRow('Xiaomi')).getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});
