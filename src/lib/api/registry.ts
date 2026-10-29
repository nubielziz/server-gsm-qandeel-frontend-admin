// The data-provider registry (decision 005): which typed API function serves each Refine data operation of a
// resource. Features export a registry from `api/resources.ts`; `app/resources.ts` merges them.
import type { ApiInit } from './client';
import type { ListQuery, ListResult } from './types';

type RowId = string | number;

/**
 * The operations one CRUD resource supports. Declared with method syntax on purpose: that keeps parameter
 * types bivariant, so a feature's `createStaff(body: CreateStaffBody)` fits an entry typed with `unknown`.
 * Leave out an operation the endpoint does not offer; the data provider then reports it clearly.
 */
export interface ResourceApi<TRow = unknown, TCreate = unknown, TUpdate = unknown> {
  list?(query: ListQuery, init?: ApiInit): Promise<ListResult<TRow>>;
  show?(id: RowId, init?: ApiInit): Promise<TRow>;
  create?(body: TCreate): Promise<TRow>;
  update?(id: RowId, body: TUpdate): Promise<TRow>;
  delete?(id: RowId): Promise<unknown>;
}

/** Resource name (the API path segment, e.g. `staff`, `ip-rules`) to its operations. */
export type ResourceRegistry = Record<string, ResourceApi>;

/** Joins the registries of several features. Two features claiming the same resource name is a bug, so it throws. */
export function mergeRegistries(...registries: ResourceRegistry[]): ResourceRegistry {
  const merged: ResourceRegistry = {};
  for (const registry of registries) {
    for (const [name, api] of Object.entries(registry)) {
      if (Object.hasOwn(merged, name)) throw new Error(`Resource "${name}" is registered twice.`);
      merged[name] = api;
    }
  }
  return merged;
}
