// Tests for the data provider: Refine params mapped to simple-rest and dispatched to the registry.
import type { MetaQuery } from '@refinedev/core';
import { describe, expect, it, vi } from 'vitest';
import type { ApiInit, ListQuery, ResourceRegistry } from '@/lib/api';
import { createDataProvider } from './dataProvider';

type Row = { id: number; name: string };

function setup() {
  const rows: Row[] = [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
  ];
  const list = vi.fn(async (_query: ListQuery, _init?: ApiInit) => ({ data: rows, total: 42 }));
  const show = vi.fn(async (id: string | number) => ({ id: Number(id), name: 'one' }));
  const create = vi.fn(async (body: { name: string }) => ({ id: 3, ...body }));
  const update = vi.fn(async (id: string | number, body: { name: string }) => ({ id: Number(id), ...body }));
  const remove = vi.fn(async (_id: string | number): Promise<unknown> => undefined);
  const registry: ResourceRegistry = {
    staff: { list, show, create, update, delete: remove },
    readonly: { list },
    detailOnly: { show },
  };
  return { provider: createDataProvider(registry, 'https://api.test'), list, show, create, update, remove };
}

describe('createDataProvider', () => {
  it('getList turns Refine params into a list query and returns rows with the total', async () => {
    const { provider, list } = setup();
    const result = await provider.getList({
      resource: 'staff',
      pagination: { currentPage: 2, pageSize: 20 },
      sorters: [{ field: 'name', order: 'asc' }],
      filters: [
        { field: 'status', operator: 'eq', value: 'active' },
        { field: 'q', operator: 'contains', value: 'ra' },
      ],
    });
    expect(result).toEqual({
      data: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      total: 42,
    });
    expect(list).toHaveBeenCalledWith(
      { start: 20, end: 40, sort: ['name'], order: ['asc'], q: 'ra', filters: { status: 'active' } },
      undefined,
    );
  });

  it('passes the query signal on so a leaving page cancels the request', async () => {
    const { provider, list } = setup();
    const controller = new AbortController();
    // Refine's real query context carries more than the signal; the provider only reads the signal.
    const queryContext = { queryKey: [], signal: controller.signal } as unknown as NonNullable<
      MetaQuery['queryContext']
    >;
    await provider.getList({ resource: 'staff', meta: { queryContext } });
    expect(list.mock.calls[0][1]).toEqual({ signal: controller.signal });
  });

  it('getMany asks the list endpoint for exactly those ids', async () => {
    const { provider, list } = setup();
    const result = await provider.getMany!({ resource: 'staff', ids: [1, 2] });
    expect(result.data).toHaveLength(2);
    expect(list).toHaveBeenCalledWith({ start: 0, end: 2, filters: { id: [1, 2] } }, undefined);
  });

  it('getMany makes no call for an empty id list, and falls back to show when there is no list', async () => {
    const { provider, list, show } = setup();
    await expect(provider.getMany!({ resource: 'staff', ids: [] })).resolves.toEqual({ data: [] });
    expect(list).not.toHaveBeenCalled();
    const result = await provider.getMany!({ resource: 'detailOnly', ids: [5, 6] });
    expect(show).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual([
      { id: 5, name: 'one' },
      { id: 6, name: 'one' },
    ]);
  });

  it('getOne, create and update dispatch to the registered functions', async () => {
    const { provider, show, create, update } = setup();
    await expect(provider.getOne({ resource: 'staff', id: '7' })).resolves.toEqual({
      data: { id: 7, name: 'one' },
    });
    expect(show).toHaveBeenCalledWith('7', undefined);
    await expect(provider.create({ resource: 'staff', variables: { name: 'new' } })).resolves.toEqual({
      data: { id: 3, name: 'new' },
    });
    expect(create).toHaveBeenCalledWith({ name: 'new' });
    await expect(
      provider.update({ resource: 'staff', id: 4, variables: { name: 'changed' } }),
    ).resolves.toEqual({
      data: { id: 4, name: 'changed' },
    });
    expect(update).toHaveBeenCalledWith(4, { name: 'changed' });
  });

  it('deleteOne hands Refine the id when the API answers with nothing', async () => {
    const { provider, remove } = setup();
    await expect(provider.deleteOne({ resource: 'staff', id: 9 })).resolves.toEqual({ data: { id: 9 } });
    expect(remove).toHaveBeenCalledWith(9);
    remove.mockResolvedValueOnce({ id: 9, name: 'gone' });
    await expect(provider.deleteOne({ resource: 'staff', id: 9 })).resolves.toEqual({
      data: { id: 9, name: 'gone' },
    });
  });

  it('keeps `this` for functions registered as object methods', async () => {
    const api = {
      prefix: 'x-',
      async show(this: { prefix: string }, id: string | number) {
        return { id: Number(id), name: `${this.prefix}${id}` };
      },
    };
    const provider = createDataProvider({ things: api }, '');
    await expect(provider.getOne({ resource: 'things', id: 1 })).resolves.toEqual({
      data: { id: 1, name: 'x-1' },
    });
  });

  it('says which resource is not registered', async () => {
    const { provider } = setup();
    await expect(provider.getList({ resource: 'ghost' })).rejects.toThrow(
      /No API is registered for resource "ghost"/,
    );
    await expect(provider.getOne({ resource: 'toString', id: 1 })).rejects.toThrow(/resource "toString"/);
  });

  it('says which operation a resource does not support', async () => {
    const { provider } = setup();
    await expect(provider.update({ resource: 'readonly', id: 1, variables: {} })).rejects.toThrow(
      /Resource "readonly" does not support "update"/,
    );
    await expect(provider.deleteOne({ resource: 'detailOnly', id: 1 })).rejects.toThrow(
      /does not support "delete"/,
    );
  });

  it('does not implement custom on purpose, and reports the API url', () => {
    const { provider } = setup();
    expect(provider.custom).toBeUndefined();
    expect(provider.getApiUrl()).toBe('https://api.test');
  });
});
