// Tests for dragging the rows of the Group view to a new place (decision 038), run through the whole app against the dev mock API. A test does not
// drag with a pointer (jsdom has no layout): it drops through the DndContext's own `onDragEnd`, the handler the library calls at a drop. The cases:
// the grips, the new order shown at once, ONE call with only the groups whose position changed, the list given back when the server refuses,
// dragging off while a search is on and for a role without catalog:update, and what a save that runs leaves alone (decision 042): the table
// does not move, the grips stay on, drops are saved in order and the lists are read again once. The keyboard path itself is in
// SortableTable.test.tsx.
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { listCategories } from '../../../api';
import { groupHandlers } from '../../../mocks/testGroups';
import { dndProps, dropRow } from '../../../test/dnd';
import { openProducts } from '../../../test/productsPage';
import { recordRequests, sentTo } from '../../../test/requests';

vi.mock('@dnd-kit/core', async (original) =>
  (await import('../../../test/dnd')).spyOnDndContext(await original()),
);

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
beforeEach(() => mockServer.use(...groupHandlers));
afterEach(() => vi.restoreAllMocks());

const IMEI_GROUPS = ['Apple', 'Samsung', 'Generic', 'Carrier unlock', 'Xiaomi'];
const GROUPS = '/products?view=groups';
const ORDER = '/admin/service-categories/order';

async function groupTable() {
  return within(await screen.findByRole('table', { name: 'Service groups' }, { timeout: 10_000 }));
}

/** The names in the table, in order (the name is the third cell: grip, tick, name). */
async function groupNames() {
  const table = await groupTable();
  return table
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[2].textContent);
}

/** The groups the server holds, by name. */
async function stored() {
  return new Map((await listCategories()).data.map((category) => [category.name, category]));
}

const grip = (name: string) => screen.getByRole('button', { name: `Drag ${name}` });

/** The id of a group by name, as the server holds it. */
async function idOf(name: string) {
  const found = (await stored()).get(name);
  if (!found) throw new Error(`No group is named "${name}".`);
  return found.id;
}

describe('the grips', () => {
  it('puts a grip in the first cell of every row, with a header only a screen reader reads', async () => {
    await openProducts(GROUPS);
    await groupTable();
    for (const name of IMEI_GROUPS) {
      const grip = screen.getByRole('button', { name: `Drag ${name}` });
      expect(grip).toBeEnabled();
      expect(grip.closest('td')).toBe(grip.closest('tr')?.querySelector('td'));
      expect(grip).toHaveAttribute('title', 'Drag to a new place');
    }
    expect(screen.getByRole('columnheader', { name: 'Drag to reorder' })).toBeInTheDocument();
  });

  it('keeps the whole row clickable and its text selectable: only the grip starts a drag', async () => {
    await openProducts(GROUPS);
    await groupTable();
    const row = screen.getByText('Samsung').closest('tr') as HTMLElement;
    // The library's listeners and its accessibility attributes sit on the grip alone.
    expect(grip('Samsung')).toHaveAttribute('aria-roledescription', 'sortable');
    expect(row).not.toHaveAttribute('aria-roledescription');
    expect(within(row).getByRole('link', { name: 'Edit Samsung' })).toBeInTheDocument();
  });

  it('uses the pointer and the keyboard, and tells a screen reader how in English', async () => {
    await openProducts(GROUPS);
    await groupTable();
    const props = dndProps();
    expect(props.sensors).toHaveLength(2);
    expect(props.accessibility?.screenReaderInstructions?.draggable).toMatch(/arrow keys/);
    expect(
      props.accessibility?.announcements?.onDragStart({ active: { id: await idOf('Apple') } } as never),
    ).toBe('Picked up Apple, position 1 of 5.');
  });
});

describe('a drop', () => {
  it('shows the new order at once, saves it in ONE call and keeps it', async () => {
    await openProducts(GROUPS);
    await groupTable();
    const ids = { apple: await idOf('Apple'), xiaomi: await idOf('Xiaomi') };
    const requests = recordRequests();
    await dropRow(ids.xiaomi, ids.apple);
    await waitFor(async () => expect(await groupNames()).toEqual(['Xiaomi', ...IMEI_GROUPS.slice(0, 4)]));
    await waitFor(() => expect(sentTo(requests, 'POST', ORDER)).toHaveLength(1));
    expect(requests.sent().filter((request) => request.method === 'PATCH')).toHaveLength(0);
    // The server holds the same order the table showed.
    const held = await stored();
    expect(
      IMEI_GROUPS.map((name) => held.get(name)!)
        .sort((a, b) => a.sort - b.sort || a.id - b.id)
        .map((g) => g.name),
    ).toEqual(['Xiaomi', ...IMEI_GROUPS.slice(0, 4)]);
    expect(await groupNames()).toEqual(['Xiaomi', ...IMEI_GROUPS.slice(0, 4)]);
  });

  it('sends only the groups whose position changes', async () => {
    await openProducts(GROUPS);
    await groupTable();
    const before = await stored();
    const requests = recordRequests();
    // Samsung dropped on Apple: two neighbours swap, so the other three keep their numbers.
    await dropRow(before.get('Samsung')!.id, before.get('Apple')!.id);
    await waitFor(() => expect(sentTo(requests, 'POST', ORDER)).toHaveLength(1));
    expect(sentTo(requests, 'POST', ORDER)[0].body).toEqual({
      items: [
        { id: before.get('Samsung')!.id, sort: before.get('Apple')!.sort },
        { id: before.get('Apple')!.id, sort: before.get('Samsung')!.sort },
      ],
    });
    await waitFor(async () =>
      expect(await groupNames()).toEqual(['Samsung', 'Apple', 'Generic', 'Carrier unlock', 'Xiaomi']),
    );
  });

  it('shows the new order while the server has not answered', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockServer.use(
      http.post('*/admin/service-categories/order', async () => {
        await gate;
        return HttpResponse.json({ updated: 2 });
      }),
    );
    await openProducts(GROUPS);
    await groupTable();
    const original = await stored();
    await dropRow(original.get('Generic')!.id, original.get('Apple')!.id);
    // Not answered yet, and already drawn in the new place.
    expect(await groupNames()).toEqual(['Generic', 'Apple', 'Samsung', 'Carrier unlock', 'Xiaomi']);
    release();
  });

  it('ignores a drop on itself or on nothing', async () => {
    await openProducts(GROUPS);
    await groupTable();
    const apple = await idOf('Apple');
    const requests = recordRequests();
    await dropRow(apple, apple);
    await dropRow(apple, null);
    await act(async () => {});
    expect(sentTo(requests, 'POST', ORDER)).toHaveLength(0);
    expect(await groupNames()).toEqual(IMEI_GROUPS);
  });

  it('drops within the page that is shown', async () => {
    await openProducts(`${GROUPS}&size=2&page=2`);
    await groupTable();
    await dropRow(await idOf('Carrier unlock'), await idOf('Generic'));
    await waitFor(async () => expect(await groupNames()).toEqual(['Carrier unlock', 'Generic']));
    expect((await stored()).get('Carrier unlock')!.sort).toBeLessThan((await stored()).get('Generic')!.sort);
  });

  it("gives the list back as it was, and says the server's words, when the server refuses", async () => {
    mockServer.use(
      http.post('*/admin/service-categories/order', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'items.0.id', message: 'No category has the id 9.' },
        ]),
      ),
    );
    await openProducts(GROUPS);
    await groupTable();
    await dropRow(await idOf('Xiaomi'), await idOf('Apple'));
    expect(await screen.findByText('Check the form')).toBeInTheDocument();
    expect(screen.getByText('No category has the id 9.')).toBeInTheDocument();
    await waitFor(async () => expect(await groupNames()).toEqual(IMEI_GROUPS));
    expect((await stored()).get('Xiaomi')!.sort).toBeGreaterThan((await stored()).get('Apple')!.sort);
  });

  it('gives the list back when the call is not answered at all', async () => {
    mockServer.use(http.post('*/admin/service-categories/order', () => HttpResponse.error()));
    await openProducts(GROUPS);
    await groupTable();
    await dropRow(await idOf('Xiaomi'), await idOf('Apple'));
    await waitFor(async () => expect(await groupNames()).toEqual(IMEI_GROUPS));
    expect(screen.getByRole('button', { name: 'Drag Xiaomi' })).toBeEnabled();
  });
});

describe('dragging is off', () => {
  it('while a search is on, with a hint, and comes back when the search is cleared', async () => {
    const user = userEvent.setup();
    await openProducts(GROUPS);
    await groupTable();
    const box = screen.getByRole('searchbox', { name: 'Search groups by name' });
    await user.type(box, 'a{Enter}');
    await waitFor(() => expect(screen.getByText('Clear the search to drag groups.')).toBeInTheDocument());
    for (const button of screen.getAllByRole('button', { name: /^Drag / })) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Clear the search to drag groups');
    }
    await user.clear(box);
    await user.type(box, '{Enter}');
    await waitFor(() =>
      expect(screen.queryByText('Clear the search to drag groups.')).not.toBeInTheDocument(),
    );
    expect(grip('Apple')).toBeEnabled();
  });

  it('for a role without catalog:update, with the lock the buttons show', async () => {
    await openProducts(GROUPS, { permissions: ['catalog:read'] });
    await groupTable();
    expect(grip('Apple')).toBeDisabled();
    expect(grip('Apple').getAttribute('title')).toMatch(/catalog:update/);
    // The reason is in the page too, not only in the title of a disabled grip.
    expect(screen.getByText(/^You need the catalog:update permission\.$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Samsung up' })).toBeDisabled();
  });
});

describe('while a save runs (decision 042)', () => {
  const LISTS = '/admin/service-categories';

  /** Holds every order call until `release`; `answers` decides each one in turn (true lets the mock save it, false refuses it). */
  function gateOrders(answers: boolean[] = []) {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const bodies: unknown[] = [];
    mockServer.use(
      http.post('*/admin/service-categories/order', async ({ request }) => {
        const index = bodies.push(await request.clone().json()) - 1;
        await gate;
        // `undefined` falls through to the mock API, which stores the positions.
        return (answers[index] ?? true)
          ? undefined
          : problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
              { field: 'items.0.id', message: 'No category has the id 9.' },
            ]);
      }),
    );
    return { release: () => release(), bodies };
  }

  it('leaves the table alone: no line above it, the grips stay on', async () => {
    const orders = gateOrders();
    await openProducts(GROUPS);
    await groupTable();
    await dropRow(await idOf('Samsung'), await idOf('Apple'));
    expect(await groupNames()).toEqual(['Samsung', 'Apple', 'Generic', 'Carrier unlock', 'Xiaomi']);
    expect(screen.queryByText('Saving the new order.')).not.toBeInTheDocument();
    for (const name of IMEI_GROUPS) {
      expect(grip(name)).toBeEnabled();
      expect(grip(name)).toHaveAttribute('title', 'Drag to a new place');
    }
    orders.release();
    await waitFor(() => expect(orders.bodies).toHaveLength(1));
  });

  it('takes the next drop at once, works it out on the order the first one left, and sends the two in order', async () => {
    const orders = gateOrders();
    await openProducts(GROUPS);
    await groupTable();
    const before = await stored();
    const requests = recordRequests();
    await dropRow(before.get('Samsung')!.id, before.get('Apple')!.id);
    await dropRow(before.get('Xiaomi')!.id, before.get('Samsung')!.id);
    // Both drops are on screen before the server has answered the first.
    expect(await groupNames()).toEqual(['Xiaomi', 'Samsung', 'Apple', 'Generic', 'Carrier unlock']);
    // The second waits for the first: one call is out.
    await waitFor(() => expect(orders.bodies).toHaveLength(1));
    orders.release();
    await waitFor(() => expect(orders.bodies).toHaveLength(2));
    expect(orders.bodies[0]).toEqual({
      items: [
        { id: before.get('Samsung')!.id, sort: before.get('Apple')!.sort },
        { id: before.get('Apple')!.id, sort: before.get('Samsung')!.sort },
      ],
    });
    // The second call moves Xiaomi to the first place of the order the first drop left (Samsung, Apple, Generic, Carrier unlock, Xiaomi).
    const second = (orders.bodies[1] as { items: { id: number; sort: number }[] }).items;
    expect(second[0]).toEqual({ id: before.get('Xiaomi')!.id, sort: before.get('Apple')!.sort });
    expect(second.map((item) => item.id)).toContain(before.get('Samsung')!.id);
    // The lists are read again once for the two saves, after the last of them, and the order stays.
    await waitFor(() => expect(sentTo(requests, 'GET', LISTS).length).toBeGreaterThan(0));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    expect(sentTo(requests, 'GET', LISTS)).toHaveLength(1);
    expect(await groupNames()).toEqual(['Xiaomi', 'Samsung', 'Apple', 'Generic', 'Carrier unlock']);
  });

  it('does not read the lists again between a save and the next drop', async () => {
    await openProducts(GROUPS);
    await groupTable();
    const ids = { samsung: await idOf('Samsung'), apple: await idOf('Apple') };
    const requests = recordRequests();
    await dropRow(ids.samsung, ids.apple);
    await waitFor(() => expect(sentTo(requests, 'POST', ORDER)).toHaveLength(1));
    // The save is in and no read has started: the table shows the drop without waiting for one.
    expect(sentTo(requests, 'GET', LISTS)).toHaveLength(0);
    expect(await groupNames()).toEqual(['Samsung', 'Apple', 'Generic', 'Carrier unlock', 'Xiaomi']);
    await waitFor(() => expect(sentTo(requests, 'GET', LISTS)).toHaveLength(1));
    expect(await groupNames()).toEqual(['Samsung', 'Apple', 'Generic', 'Carrier unlock', 'Xiaomi']);
  });

  it('gives back every drop, and does not send the later one, when the first is refused', async () => {
    const orders = gateOrders([false]);
    await openProducts(GROUPS);
    await groupTable();
    await dropRow(await idOf('Samsung'), await idOf('Apple'));
    await dropRow(await idOf('Xiaomi'), await idOf('Samsung'));
    orders.release();
    expect(await screen.findByText('No category has the id 9.')).toBeInTheDocument();
    await waitFor(async () => expect(await groupNames()).toEqual(IMEI_GROUPS));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    // The second drop was worked out on an order the server never took.
    expect(orders.bodies).toHaveLength(1);
    expect(grip('Xiaomi')).toBeEnabled();
  });

  it('keeps the drop the server took when a later one is refused', async () => {
    let calls = 0;
    mockServer.use(
      http.post('*/admin/service-categories/order', () => {
        calls += 1;
        // The first call falls through to the mock, which saves it; the second is refused.
        return calls === 1
          ? undefined
          : problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
              { field: 'items.0.id', message: 'No category has the id 9.' },
            ]);
      }),
    );
    await openProducts(GROUPS);
    await groupTable();
    await dropRow(await idOf('Samsung'), await idOf('Apple'));
    await dropRow(await idOf('Xiaomi'), await idOf('Samsung'));
    expect(await screen.findByText('No category has the id 9.')).toBeInTheDocument();
    await waitFor(async () =>
      expect(await groupNames()).toEqual(['Samsung', 'Apple', 'Generic', 'Carrier unlock', 'Xiaomi']),
    );
    expect((await stored()).get('Samsung')!.sort).toBeLessThan((await stored()).get('Apple')!.sort);
  });
});

describe('the buttons use the same save', () => {
  it('sends the one call a drop over one place sends', async () => {
    const user = userEvent.setup();
    await openProducts(GROUPS);
    await groupTable();
    const before = await stored();
    const requests = recordRequests();
    await user.click(screen.getByRole('button', { name: 'Move Generic down' }));
    await waitFor(() => expect(sentTo(requests, 'POST', ORDER)).toHaveLength(1));
    expect(sentTo(requests, 'POST', ORDER)[0].body).toEqual({
      items: [
        { id: before.get('Carrier unlock')!.id, sort: before.get('Generic')!.sort },
        { id: before.get('Generic')!.id, sort: before.get('Carrier unlock')!.sort },
      ],
    });
    expect(await screen.findByText('Generic moved to position 4 of 5')).toBeInTheDocument();
  });
});
