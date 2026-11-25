// Tests for the Group view on a long list, run through the whole app against the 265 groups the shop held on 2026-11-25 (see test/manyGroups.ts):
// the list is read whole in one request of 1000 rows, so groups past the old 200-row cap show; the warning when the server holds more than it
// sent; the Quick Search over the whole list; and the view after "Add" (the page that holds the new group, marked, the key gone from the address).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { groupHandlers } from '../../../mocks/testGroups';
import { manyGroupHandlers } from '../../../test/manyGroups';
import { openProducts } from '../../../test/productsPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

let list: ReturnType<typeof manyGroupHandlers>;
beforeEach(() => {
  list = manyGroupHandlers();
  mockServer.use(...groupHandlers, ...list.handlers);
});

const SERVER = '/products?view=groups&type=server';

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

/** The group the view has marked as just added (the name's own element), or null. */
const marked = () => document.querySelector('[aria-current="true"]');

describe('reading every group', () => {
  it('asks for 1000 rows at once, and lists the last group of a kind on its page', async () => {
    await openProducts(`${SERVER}&page=5`);
    await waitFor(async () => expect((await groupNames()).at(-1)).toBe('server group 217'), {
      timeout: 10_000,
    });
    expect(await groupNames()).toHaveLength(17);
    expect(screen.getByText('Results: 201 - 217 of 217')).toBeInTheDocument();
    expect(list.reads.length).toBeGreaterThan(0);
    for (const read of list.reads) {
      expect([read.searchParams.get('_start'), read.searchParams.get('_end')]).toEqual(['0', '1000']);
    }
    expect(screen.queryByText(/Only the first/)).not.toBeInTheDocument();
  });

  it('lists the group added last, in a kind that the old cap hid', async () => {
    await openProducts('/products?view=groups&type=file');
    await waitFor(async () => expect(await groupNames()).toEqual(['file group 264', 'apple']), {
      timeout: 10_000,
    });
  });

  it('warns above the table when the server holds more groups than it sent', async () => {
    mockServer.use(
      http.get('*/admin/service-categories', () =>
        HttpResponse.json(list.groups.slice(0, 3), { headers: { 'x-total-count': '1200' } }),
      ),
    );
    await openProducts(SERVER);
    const warning = await screen.findByText('Only the first 3 of 1200 groups are listed.');
    const table = await screen.findByRole('table', { name: 'Service groups' });
    // The warning comes before the table in the page.
    expect(warning.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(warning).toHaveClass('text-warn-fg');
  });
});

describe('Quick Search over the whole list', () => {
  it('finds groups past the 200th and counts the matches in the pager', async () => {
    const user = userEvent.setup();
    const app = await openProducts(SERVER);
    await groupTable();
    await user.type(screen.getByRole('searchbox', { name: 'Search groups by name' }), 'GROUP 21{Enter}');
    await waitFor(() => expect(app.location()).toBe('/products?view=groups&type=server&q=GROUP+21'), {
      timeout: 10_000,
    });
    await waitFor(async () =>
      expect(await groupNames()).toEqual([
        'server group 21',
        ...Array.from({ length: 8 }, (_, at) => `server group 21${at}`),
      ]),
    );
    expect(screen.getByText('Results: 1 - 9 of 9')).toBeInTheDocument();
  });
});

describe('after Add', () => {
  /** Opens +Add Group of the Server kind, adds a group by this name and returns the app. */
  async function addServerGroup(name: string) {
    const user = userEvent.setup();
    const app = await openProducts('/products?view=add-group&type=server');
    await user.type(await screen.findByRole('textbox', { name: 'Group Name' }, { timeout: 10_000 }), name);
    await user.click(screen.getByRole('button', { name: 'Add' }));
    return app;
  }

  it('opens the page that holds the new group, marks it and leaves the address without the key', async () => {
    const app = await addServerGroup('Fresh server group');
    // 218 groups of the kind at 50 a page: the new one is the 18th of page 5.
    await waitFor(() => expect(app.location()).toBe('/products?view=groups&type=server&page=5'), {
      timeout: 10_000,
    });
    const row = await screen.findByText('Fresh server group');
    expect(row).toHaveAttribute('aria-current', 'true');
    expect(await screen.findByText('Added Fresh server group')).toHaveAttribute('role', 'status');
    expect(app.location()).not.toContain('group=');
    expect((await groupNames()).at(-1)).toBe('Fresh server group');
    expect(screen.getByText('Results: 201 - 218 of 218')).toBeInTheDocument();
  });

  it('clears a search that would hide the new group', async () => {
    const app = await openProducts(`${SERVER}&group=100&q=zzz`);
    await waitFor(() => expect(app.location()).toBe('/products?view=groups&type=server&page=2'), {
      timeout: 10_000,
    });
    expect(await screen.findByText('server group 100')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('searchbox', { name: 'Search groups by name' })).toHaveValue('');
  });

  it('keeps a search that shows the new group, and opens the page that holds it in the matches', async () => {
    const app = await openProducts(`${SERVER}&group=105&q=server`);
    await waitFor(() => expect(app.location()).toBe('/products?view=groups&type=server&q=server&page=3'), {
      timeout: 10_000,
    });
    expect(await screen.findByText('server group 105')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('searchbox', { name: 'Search groups by name' })).toHaveValue('server');
  });

  it('only drops the key for a group the list does not hold', async () => {
    const app = await openProducts(`${SERVER}&group=999`);
    await waitFor(() => expect(app.location()).toBe(SERVER), { timeout: 10_000 });
    await groupTable();
    expect(marked()).toBeNull();
  });
});
