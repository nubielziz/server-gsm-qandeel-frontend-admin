// Tests for what a service change makes stale: creating, moving or deleting a service refreshes the category lists, so the count of
// services in each category (`serviceCount`) stays true without a reload. A hook reads the categories while another changes a service.
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { createService, listServices } from '../api';
import { AppWrapper } from '../test/AppWrapper';
import { useCategories } from './useChoices';
import { useCreateService, useDeleteService, useUpdateService } from './useServiceMutations';
import { staleServices, staleServicesAndCategories } from './keys';

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
      create: useCreateService(),
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
  it('go up when a service is created', async () => {
    await signInAs();
    const { result } = rig();
    await waitFor(() => expect(countOf(result, APPLE)).toBe(4));
    await act(() => result.current.create.mutateAsync(body));
    await waitFor(() => expect(countOf(result, APPLE)).toBe(5));
  });

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
