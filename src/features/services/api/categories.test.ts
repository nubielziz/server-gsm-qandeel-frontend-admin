// Tests for the order of groups (`POST /admin/service-categories/order`, backend decision 078), run against the dev mock API: the route and the body
// of the contract, the answer (how many groups moved), the refusals named by item, and the 403 for a session without catalog:update.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { roleStore } from '@/mocks/roles';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import { listCategories, orderCategories } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

const APPLE = 1;
const SAMSUNG = 2;

/** The refusal an API function threw. */
const refusal = (error: unknown) => error as ApiError;

/** The position of a group as the server holds it. */
async function sortOf(id: number) {
  return (await listCategories()).data.find((category) => category.id === id)?.sort;
}

describe('orderCategories', () => {
  it('stores positions in one call and answers how many groups moved; the same positions again move none', async () => {
    const requests = recordRequests();
    const items = [
      { id: APPLE, sort: 2 },
      { id: SAMSUNG, sort: 1 },
    ];
    expect(await orderCategories({ items })).toEqual({ updated: 2 });
    expect(requests.last()).toMatchObject({ method: 'POST', body: { items } });
    expect(requests.last().url.pathname).toBe('/admin/service-categories/order');
    expect(await sortOf(APPLE)).toBe(2);
    expect(await sortOf(SAMSUNG)).toBe(1);
    expect(await orderCategories({ items })).toEqual({ updated: 0 });
  });

  it('does not count a group already at its position', async () => {
    expect(
      await orderCategories({
        items: [
          { id: APPLE, sort: 1 },
          { id: SAMSUNG, sort: 9 },
        ],
      }),
    ).toEqual({ updated: 1 });
  });

  it('refuses the whole call and names the item: an unknown group, one listed twice, a position out of range', async () => {
    const unknown = refusal(
      await orderCategories({ items: [{ id: 999, sort: 1 }] }).catch((error: unknown) => error),
    );
    expect(unknown.status).toBe(422);
    expect(unknown.fieldErrors['items.0.id']).toEqual(['No category has the id 999.']);

    const twice = refusal(
      await orderCategories({
        items: [
          { id: APPLE, sort: 1 },
          { id: APPLE, sort: 2 },
        ],
      }).catch((error: unknown) => error),
    );
    expect(twice.fieldErrors['items.1.id']).toEqual(['This category is listed twice.']);

    const far = refusal(
      await orderCategories({ items: [{ id: APPLE, sort: 1_000_001 }] }).catch((error: unknown) => error),
    );
    expect(far.fieldErrors['items.0.sort']).toEqual(['Use at most 1000000.']);

    const none = refusal(await orderCategories({ items: [] }).catch((error: unknown) => error));
    expect(none.fieldErrors.items).toEqual(['Send at least one category.']);
    // Nothing was saved by any of them.
    expect(await sortOf(APPLE)).toBe(1);
  });

  it('says what is wrong with a position or the size of the call in the words of the backend contract', async () => {
    const below = refusal(
      await orderCategories({ items: [{ id: APPLE, sort: -1 }] }).catch((error: unknown) => error),
    );
    expect(below.fieldErrors['items.0.sort']).toEqual(['Enter 0 or more.']);
    const fraction = refusal(
      await orderCategories({ items: [{ id: APPLE, sort: 1.5 }] }).catch((error: unknown) => error),
    );
    expect(fraction.fieldErrors['items.0.sort']).toEqual(['Enter a whole number.']);
    const many = refusal(
      await orderCategories({ items: Array.from({ length: 501 }, () => ({ id: APPLE, sort: 1 })) }).catch(
        (error: unknown) => error,
      ),
    );
    expect(many.fieldErrors.items).toEqual(['Send at most 500 categories at a time.']);
  });

  it('is refused with 403 for a session without catalog:update, and saves nothing', async () => {
    roleStore().patch(1, { permissions: ['catalog:read'] });
    const error = refusal(
      await orderCategories({ items: [{ id: APPLE, sort: 9 }] }).catch((thrown: unknown) => thrown),
    );
    expect(error.status).toBe(403);
    expect(error.detail).toBe('You need the catalog:update permission to change the order of groups.');
    expect(await sortOf(APPLE)).toBe(1);
  });
});
