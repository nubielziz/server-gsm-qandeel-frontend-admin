// Tests for dragging the services of the Pricing view to a new place (decision 038), run through the whole app against the dev mock API. A test does not
// drag with a pointer (jsdom has no layout): it drops through the DndContext's own `onDragEnd`. The grips come with "Set Order" and work for the
// services of one chosen group that the page holds in full; the cases: the grips, ONE `POST /admin/services/order` with only the services whose
// position changed, the new order shown at once, the list given back with the server's words on a refusal, and dragging off (no group, a search,
// typed positions, a save running).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { listPriceGrid } from '../../../api';
import { groupHandlers } from '../../../mocks/testGroups';
import { dropRow } from '../../../test/dnd';
import { openProducts } from '../../../test/productsPage';
import { recordRequests, sentTo } from '../../../test/requests';

vi.mock('@dnd-kit/core', async (original) =>
  (await import('../../../test/dnd')).spyOnDndContext(await original()),
);

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => mockServer.use(...groupHandlers));
afterEach(() => vi.restoreAllMocks());

const ORDER = '/admin/services/order';
// The Apple group (id 1) holds four services, all at position 0, so the grid lists them by name.
const APPLE_GROUP = '/products?view=pricing&type=imei&group=1';
const APPLE = [
  { id: 2, name: 'Apple Warranty & Activation Date' },
  { id: 1, name: 'iCloud Clean / Lost Check' },
  { id: 12, name: 'iCloud Lost Mode Removal' },
  { id: 11, name: 'MDM Removal, iPhone Premium' },
];
const [WARRANTY, CLEAN, LOST, MDM] = APPLE;

async function openPricing(route: string, firstService: string = WARRANTY.name) {
  const app = await openProducts(route);
  await screen.findByRole('table', { name: 'Price grid' }, { timeout: 10_000 });
  await screen.findByText(firstService, undefined, { timeout: 10_000 });
  return app;
}

/** Ticks "Set Order", which adds the Order boxes and the grips. */
async function setOrder(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('checkbox', { name: 'Set Order' }));
  await screen.findByRole('columnheader', { name: 'Order' });
}

/** The names of the services in the grid, in order (with the grips on, the name is the second cell, after the grip). */
async function serviceNames() {
  const table = within(await screen.findByRole('table', { name: 'Price grid' }));
  return table
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1].textContent?.split('#')[0] ?? '');
}

const grip = (name: string) => screen.getByRole('button', { name: `Drag ${name}` });
const position = (name: string) => screen.getByRole('textbox', { name: `Position of ${name}` });

describe('the grips', () => {
  it('come with Set Order, one in the first cell of every row', async () => {
    const user = userEvent.setup();
    await openPricing(APPLE_GROUP);
    expect(screen.queryByRole('button', { name: /^Drag / })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Drag to reorder' })).not.toBeInTheDocument();
    await setOrder(user);
    for (const service of APPLE) expect(grip(service.name)).toBeEnabled();
    expect(screen.getByRole('columnheader', { name: 'Drag to reorder' })).toBeInTheDocument();
    expect(grip(MDM.name).closest('td')).toBe(grip(MDM.name).closest('tr')?.querySelector('td'));
  });
});

describe('a drop', () => {
  it('saves the positions that changed in ONE call, shows the new order and the new numbers', async () => {
    const user = userEvent.setup();
    await openPricing(APPLE_GROUP);
    await setOrder(user);
    const requests = recordRequests();
    await dropRow(MDM.id, WARRANTY.id);
    // The service dropped on the first place keeps position 0, the three it pushed down get 1, 2 and 3.
    await waitFor(() => expect(sentTo(requests, 'POST', ORDER)).toHaveLength(1));
    expect(sentTo(requests, 'POST', ORDER)[0].body).toEqual({
      items: [
        { id: WARRANTY.id, sort: 1 },
        { id: CLEAN.id, sort: 2 },
        { id: LOST.id, sort: 3 },
      ],
    });
    expect(await screen.findByText('Order saved')).toBeInTheDocument();
    await waitFor(async () =>
      expect(await serviceNames()).toEqual([MDM.name, WARRANTY.name, CLEAN.name, LOST.name]),
    );
    expect(position(MDM.name)).toHaveValue('0');
    expect(position(WARRANTY.name)).toHaveValue('1');
    expect(position(LOST.name)).toHaveValue('3');
    expect(requests.sent().filter((sent) => sent.method === 'PATCH')).toHaveLength(0);
    // The server holds it: the grid read again lists the same order.
    const held = (
      await listPriceGrid({ sort: ['sort'], order: ['asc'], filters: { type: 'imei', categoryId: 1 } })
    ).data;
    expect(held.map((row) => row.name)).toEqual([MDM.name, WARRANTY.name, CLEAN.name, LOST.name]);
  });

  it('shows the new order before the server has answered', async () => {
    const user = userEvent.setup();
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockServer.use(
      http.post('*/admin/services/order', async () => {
        await gate;
        return HttpResponse.json({ updated: 3 });
      }),
    );
    await openPricing(APPLE_GROUP);
    await setOrder(user);
    await dropRow(LOST.id, WARRANTY.id);
    expect(await serviceNames()).toEqual([LOST.name, WARRANTY.name, CLEAN.name, MDM.name]);
    release();
  });

  it("gives the list back, and says the server's words, when the server refuses", async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/services/order', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'items.0.id', message: 'This service was archived.' },
        ]),
      ),
    );
    await openPricing(APPLE_GROUP);
    await setOrder(user);
    await dropRow(MDM.id, WARRANTY.id);
    expect(await screen.findByText('This service was archived.')).toBeInTheDocument();
    await waitFor(async () =>
      expect(await serviceNames()).toEqual([WARRANTY.name, CLEAN.name, LOST.name, MDM.name]),
    );
    expect(position(WARRANTY.name)).toHaveValue('0');
    expect(grip(MDM.name)).toBeEnabled();
  });

  it('keeps the typed Order boxes and their Save order as they were', async () => {
    const user = userEvent.setup();
    await openPricing(APPLE_GROUP);
    await setOrder(user);
    await user.clear(position(CLEAN.name));
    await user.type(position(CLEAN.name), '9');
    await user.click(screen.getByRole('button', { name: 'Save order' }));
    expect(await screen.findByText('Order saved')).toBeInTheDocument();
    await waitFor(async () =>
      expect(await serviceNames()).toEqual([WARRANTY.name, LOST.name, MDM.name, CLEAN.name]),
    );
  });
});

describe('dragging is off', () => {
  it("while no group is chosen, with the reason as a line and as the grips' title", async () => {
    const user = userEvent.setup();
    await openPricing('/products?view=pricing&type=imei');
    await setOrder(user);
    expect(screen.getByText('Choose a group to drag its services.')).toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: /^Drag / })) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Choose a group to drag its services');
    }
  });

  it('while a search is on', async () => {
    const user = userEvent.setup();
    await openPricing(`${APPLE_GROUP}&q=icloud`, CLEAN.name);
    await setOrder(user);
    expect(screen.getByText('Clear the search to drag services.')).toBeInTheDocument();
    expect(grip(CLEAN.name)).toBeDisabled();
  });

  it('while positions are typed and not saved, and comes back once they are', async () => {
    const user = userEvent.setup();
    await openPricing(APPLE_GROUP);
    await setOrder(user);
    await user.clear(position(CLEAN.name));
    await user.type(position(CLEAN.name), '5');
    expect(screen.getByText('Save or clear the typed positions first.')).toBeInTheDocument();
    expect(grip(MDM.name)).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Save order' }));
    await waitFor(() => expect(grip(MDM.name)).toBeEnabled());
  });

  it('while a save runs: a second drop is ignored', async () => {
    const user = userEvent.setup();
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockServer.use(
      http.post('*/admin/services/order', async () => {
        await gate;
        return HttpResponse.json({ updated: 3 });
      }),
    );
    await openPricing(APPLE_GROUP);
    await setOrder(user);
    const requests = recordRequests();
    await dropRow(MDM.id, WARRANTY.id);
    expect(grip(CLEAN.name)).toBeDisabled();
    expect(grip(CLEAN.name)).toHaveAttribute('title', 'Saving the new order');
    expect(screen.getByText('Saving the new order.')).toBeInTheDocument();
    await dropRow(LOST.id, WARRANTY.id);
    release();
    await waitFor(() => expect(grip(CLEAN.name)).toBeEnabled());
    expect(screen.queryByText('Saving the new order.')).not.toBeInTheDocument();
    expect(sentTo(requests, 'POST', ORDER)).toHaveLength(1);
  });
});
