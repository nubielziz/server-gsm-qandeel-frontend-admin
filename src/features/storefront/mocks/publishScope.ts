// The rows a mock publish run starts from, by scope (section 5.2 of the backend brief), and the refusals of a scope the server would
// give: an unknown category, supplier or run is a 422 on its field, a scope with nothing left to publish is a 422 on `scope`, and
// an earlier run that is still working is a 409. The rows are the seed's 60 (the services of every choice are taken from them):
// a category takes the rows of its name, a supplier every sixth row (the mock has no supplier links), Quick add run 1 and 2 the
// first eight rows, and Quick add run 3 made nothing new.
import { conflict, invalid } from './http';
import type { MockPublishRun, MockService, Stores } from './types';
import type { PublishItem } from '../types';

const SUPPLIERS = 6;
const QUICK_ADD_RUNS = new Set([1, 2, 3]);
const NOTHING = 'Nothing to publish: every service of this choice is already on the shop.';

/** What a scope gives: the rows, the old run it replaces (a draft that is checked again), or the refusal to answer. */
export type ScopeRows = { rows: PublishItem[]; replaces?: MockPublishRun } | { refusal: Response };

const refuse = (field: string, message: string): ScopeRows => ({ refusal: invalid([{ field, message }]) });

/** A row for a ticked service that already has a listing: blocked at once, so staff see why it is not published. */
function listedRow(service: MockService, id: number, at: string): PublishItem {
  return {
    id,
    serviceId: service.id,
    service: { id: service.id, name: service.name, code: service.code, type: service.type, categoryName: '' },
    title: service.name,
    slug: '',
    brand: '',
    carrier: '',
    country: '',
    detected: { title: service.name, slug: '', brand: '', brandKind: null, carrier: '', country: '' },
    edited: false,
    cost: '0.0000',
    floorPrice: '0.0000',
    rule: null,
    rulePrice: null,
    priceMode: 'keep',
    existingPrice: null,
    replacesPrice: null,
    retailPrice: null,
    marginPct: null,
    state: 'blocked',
    blockedReason: 'already_listed',
    flags: [],
    included: false,
    evaluatedAt: at,
    result: null,
    resultReason: null,
    resultDetail: null,
    listingId: null,
    publishedPrice: null,
    listingListed: null,
  };
}

/** The same rows with ids 1 to n and no result, for a new run. */
function fresh(rows: readonly PublishItem[]): PublishItem[] {
  return rows.map((item, index) => ({
    ...item,
    id: index + 1,
    result: null,
    resultReason: null,
    resultDetail: null,
    listingId: null,
    publishedPrice: null,
    listingListed: null,
  }));
}

/** Reads a scope of a create request. A scope that is not one of the six is a 422 on `scope`. */
export function rowsOfScope(stores: Stores, scope: unknown): ScopeRows {
  const { template } = stores.publish;
  const at = new Date().toISOString();
  const body = (scope ?? {}) as Record<string, unknown>;
  const none = (rows: PublishItem[]): ScopeRows =>
    rows.length === 0 ? refuse('scope', NOTHING) : { rows: fresh(rows) };
  switch (body.kind) {
    case 'all':
      return none([...template]);
    case 'category': {
      const name = stores.pricing.categories.get(Number(body.categoryId));
      if (name === undefined) return refuse('scope.categoryId', 'Choose a category that exists.');
      return none(template.filter((item) => item.service.categoryName === name));
    }
    case 'supplier': {
      const id = Number(body.supplierId);
      if (!Number.isInteger(id) || id < 1 || id > SUPPLIERS)
        return refuse('scope.supplierId', 'Choose a supplier that exists.');
      return none(template.filter((item) => item.id % SUPPLIERS === id % SUPPLIERS));
    }
    case 'quickAddRun': {
      const id = Number(body.runId);
      if (!QUICK_ADD_RUNS.has(id)) return refuse('scope.runId', 'Choose a Quick add run that exists.');
      return none(id === 3 ? [] : template.slice(0, 8));
    }
    case 'services': {
      const ids = Array.isArray(body.serviceIds) ? [...new Set(body.serviceIds.map(Number))] : [];
      if (ids.length === 0 || ids.length > 500 || ids.some((id) => !Number.isInteger(id)))
        return refuse('scope.serviceIds', 'Pick one to 500 services.');
      const rows: PublishItem[] = [];
      for (const id of ids) {
        const service = stores.services.get(id);
        const row = template.find((item) => item.serviceId === id);
        if (row) rows.push(row);
        else if (service) rows.push(listedRow(service, 0, at));
        else return refuse('scope.serviceIds', `Service ${id} does not exist.`);
      }
      return none(rows);
    }
    case 'run': {
      const old = stores.publish.runs.find(Number(body.runId));
      if (!old) return refuse('scope.runId', 'Choose a run that exists.');
      const { status } = old.run;
      if (status === 'preparing' || status === 'queued' || status === 'running')
        return { refusal: conflict('CONFLICT', 'That run is still working', 'That run is still working.') };
      // "Check again" keeps every row and every edit; "Review the rest" takes the rows that were not published.
      const rows = status === 'draft' ? old.items : old.items.filter((item) => item.result !== 'published');
      // The staff's edits and ticks are copied; the choice to replace a typed price is never copied.
      const kept = fresh(rows).map((item, index) => ({
        ...item,
        included: rows[index].included,
        replacesPrice: null,
      }));
      return kept.length === 0
        ? refuse('scope', NOTHING)
        : { rows: kept, replaces: status === 'draft' ? old : undefined };
    }
    default:
      return refuse('scope', 'Choose what to publish.');
  }
}
