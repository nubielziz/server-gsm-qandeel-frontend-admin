// Refine data provider (decision 005): turns Refine's list/one/create/update/delete calls into calls of the typed
// API functions registered for each resource. It builds no URLs itself, so Refine hooks and custom hooks share
// one code path.
import type {
  BaseRecord,
  CreateParams,
  DataProvider,
  DeleteOneParams,
  GetListParams,
  GetManyParams,
  GetOneParams,
  MetaQuery,
  UpdateParams,
} from '@refinedev/core';
import {
  toListQuery,
  type ApiInit,
  type FilterValue,
  type ResourceApi,
  type ResourceRegistry,
} from '@/lib/api';

type Operation = keyof ResourceApi;

// Refine passes the query's AbortSignal inside `meta`; forwarding it cancels requests of pages that unmount.
function initFrom(meta: MetaQuery | undefined): ApiInit | undefined {
  const signal = meta?.queryContext?.signal;
  return signal ? { signal } : undefined;
}

/**
 * Builds the data provider over a registry. A resource or operation that is not registered throws an error that
 * names it: it is a wiring mistake (a missing entry in a feature's `api/resources.ts`), not a runtime condition.
 */
export function createDataProvider(registry: ResourceRegistry, apiUrl: string): DataProvider {
  // The registered function for an operation, or a clear error.
  function operation<K extends Operation>(resource: string, op: K): NonNullable<ResourceApi[K]> {
    if (!Object.hasOwn(registry, resource)) {
      throw new Error(
        `No API is registered for resource "${resource}". ` +
          "Add it to the feature's api/resources.ts and merge it in app/resources.ts.",
      );
    }
    const entry = registry[resource];
    const fn = entry[op];
    if (!fn) {
      throw new Error(
        `Resource "${resource}" does not support "${op}": no API function is registered for it.`,
      );
    }
    // Bind so the function keeps `this` when a feature registers methods of an object.
    return (fn as (...args: unknown[]) => unknown).bind(entry) as NonNullable<ResourceApi[K]>;
  }

  return {
    getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams) => {
      const { resource, pagination, sorters, filters, meta } = params;
      const list = operation(resource, 'list');
      const result = await list(toListQuery({ pagination, sorters, filters }), initFrom(meta));
      return { data: result.data as TData[], total: result.total };
    },

    // Several rows by id: one list call filtered by `id`, or one `show` call per id when the resource has no list.
    getMany: async <TData extends BaseRecord = BaseRecord>({ resource, ids, meta }: GetManyParams) => {
      if (ids.length === 0) return { data: [] as TData[] };
      if (Object.hasOwn(registry, resource) && registry[resource].list) {
        const list = operation(resource, 'list');
        const filters: Record<string, FilterValue[]> = { id: ids };
        const result = await list({ start: 0, end: ids.length, filters }, initFrom(meta));
        return { data: result.data as TData[] };
      }
      const show = operation(resource, 'show');
      return { data: (await Promise.all(ids.map((id) => show(id, initFrom(meta))))) as TData[] };
    },

    getOne: async <TData extends BaseRecord = BaseRecord>({ resource, id, meta }: GetOneParams) => {
      const show = operation(resource, 'show');
      return { data: (await show(id, initFrom(meta))) as TData };
    },

    create: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>({
      resource,
      variables,
    }: CreateParams<TVariables>) => {
      const create = operation(resource, 'create');
      return { data: (await create(variables)) as TData };
    },

    update: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>({
      resource,
      id,
      variables,
    }: UpdateParams<TVariables>) => {
      const update = operation(resource, 'update');
      return { data: (await update(id, variables)) as TData };
    },

    // The API answers a delete with 204; Refine wants a record back, so hand it the id.
    deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>({
      resource,
      id,
    }: DeleteOneParams<TVariables>) => {
      const remove = operation(resource, 'delete');
      const result = await remove(id);
      return { data: (result ?? { id }) as TData };
    },

    getApiUrl: () => apiUrl,
  };
}
