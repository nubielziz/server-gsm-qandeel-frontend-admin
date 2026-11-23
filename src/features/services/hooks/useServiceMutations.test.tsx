// Tests for what a service change makes stale: moving or deleting a service refreshes the category lists, so the count of services in each
// category (`serviceCount`) stays true without a reload. A hook reads the categories while another changes a service. (Creating one is the
// +Add Service view's hook, tested with that view.)
import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LISTING_DETAILS_KEY } from '@/lib/query';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { createService, listServices } from '../api';
import { AppWrapper } from '../test/AppWrapper';
import { useCategories } from './useChoices';
import { useReplaceGroupPrices } from './useServicePartMutations';
import { useDeleteService, useUpdatePrice, useUpdateService } from './useServiceMutations';
import { SERVICE_STALE_KEYS, staleServices, staleServicesAndCategories } from './keys';

setupMockApi();

const APPLE = 1; // four services at the start
const CARRIER_UNLOCK = 4; // six services at the start

const body = {
  name: 'Counted',
  code: 'CNT-1',
  categoryId: APPLE,
  type: 'imei' as const,
  slaMinutes: 5,
  basePrice: '1.0000',
};

function rig() {
  return renderHook(
    () => ({
      categories: useCategories(true),
      update: useUpdateService(),
      remove: useDeleteService(),
    }),
    { wrapper: AppWrapper },
  );
}

type Rig = ReturnType<typeof rig>['result'];
const countOf = (result: Rig, id: number) =>
  result.current.categories.categories.find((category) => category.id === id)?.serviceCount;

describe('the category counts', () => {
  it('move when a service changes category', async () => {
    await signInAs();
    const [service] = (await listServices({ q: 'EE UK' })).data;
    const { result } = rig();
    await waitFor(() => expect(countOf(result, CARRIER_UNLOCK)).toBe(6));
    await act(() => result.current.update.mutateAsync({ service, body: { categoryId: APPLE } }));
    await waitFor(() => expect(countOf(result, CARRIER_UNLOCK)).toBe(5));
    expect(countOf(result, APPLE)).toBe(5);
  });

  it('go down when a service is deleted', async () => {
    await signInAs();
    const made = await createService(body);
    const { result } = rig();
    await waitFor(() => expect(countOf(result, APPLE)).toBe(5));
    await act(() => result.current.remove.mutateAsync(made));
    await waitFor(() => expect(countOf(result, APPLE)).toBe(4));
  });
});

describe('the Refine targets', () => {
  it('name the lists and each service, and the category lists on request', () => {
    expect(staleServices(5, 6)).toEqual([
      { resource: 'services' },
      { resource: 'services', id: 5 },
      { resource: 'services', id: 6 },
    ]);
    expect(staleServicesAndCategories(5)).toEqual([...staleServices(5), { resource: 'service-categories' }]);
  });
});

describe('the listing read', () => {
  it('is among the reads a services change makes stale', () => {
    expect(SERVICE_STALE_KEYS).toContainEqual([...LISTING_DETAILS_KEY]);
  });

  it('is made stale by a merchant price save and by a group prices save, so an open shop price block reads it again', async () => {
    await signInAs();
    const [service] = (await listServices({ q: 'EE UK' })).data;
    const { result } = renderHook(
      () => ({ client: useQueryClient(), price: useUpdatePrice(), groups: useReplaceGroupPrices() }),
      { wrapper: AppWrapper },
    );
    // A copy of the listing, as the edit view's Retail Purchase part keeps it (it is kept for good until a write makes it old).
    const key = [...LISTING_DETAILS_KEY, service.id];
    const keep = () => result.current.client.setQueryData(key, { id: service.id });
    const old = () => result.current.client.getQueryState(key)?.isInvalidated;

    keep();
    expect(old()).toBe(false);
    await act(() => result.current.price.mutateAsync({ service, body: { basePrice: '99.0000' } }));
    await waitFor(() => expect(old()).toBe(true));

    keep();
    expect(old()).toBe(false);
    await act(() =>
      result.current.groups.mutateAsync({ service, body: { prices: [], retailPriceSeen: null } }),
    );
    await waitFor(() => expect(old()).toBe(true));
  });
});
