// Mock routes of Quick add (service-groups, quick-add and its run). Groups are counted with the real rule (imported, else
// unavailable, else a type that cannot be imported, else addable). Services are created when the run starts; the first read
// of a run then says half done and the next says finished (decision 014). A run that asks to publish (feature 31) is also handed to the
// storefront mock, which makes the automatic publish run Quick add's step 3 reads.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { denied } from '@/features/notifications/mocks/access';
import { anyRetailRuleActive, handOverQuickAdd } from '@/features/storefront/mocks';
import { invalid, notFound } from '@/mocks/handlers/accessShared';
import { problem } from '@/mocks/problem';
import { createFromItem } from './catalogueRoutes';
import type { MockItem, SuppliersState } from './seed';
import type { MockRun } from './seedTypes';
import { secured } from './secured';
import type {
  QuickAddGroupRef,
  QuickAddRun,
  ServiceGroup,
  ServiceGroups,
  ServiceGroupTotals,
} from '../types';

/** The types the import can turn into a service. */
const IMPORTABLE = new Set(['imei', 'server', 'remote', 'file']);
const MAX_GROUPS = 500;

type Bucket = 'imported' | 'unavailable' | 'unsupported' | 'addable';

// The same order as the server: imported first, then unavailable, then unsupported.
function bucketOf(item: MockItem): Bucket {
  if (item.imported) return 'imported';
  if (!item.isAvailable) return 'unavailable';
  return IMPORTABLE.has(item.type.trim().toLowerCase()) ? 'addable' : 'unsupported';
}

const emptyCounts = (): ServiceGroupTotals => ({
  total: 0,
  addable: 0,
  imported: 0,
  unavailable: 0,
  unsupported: 0,
});

function count(into: ServiceGroupTotals, bucket: Bucket) {
  into.total += 1;
  into[bucket] += 1;
}

const sameGroup = (a: QuickAddGroupRef, b: QuickAddGroupRef) =>
  a.type === b.type && a.remoteGroup === b.remoteGroup;

// `lower(type), lower(group), type, group`, as the server orders the rows.
function byGroup(a: QuickAddGroupRef, b: QuickAddGroupRef): number {
  return (
    a.type.toLowerCase().localeCompare(b.type.toLowerCase()) ||
    a.remoteGroup.toLowerCase().localeCompare(b.remoteGroup.toLowerCase()) ||
    a.type.localeCompare(b.type) ||
    a.remoteGroup.localeCompare(b.remoteGroup)
  );
}

/** What the console is shown of a run: queued before the first read, half done on the first, finished from the second. */
function viewOf(run: MockRun): QuickAddRun {
  const { finished, reads } = run;
  if (reads >= 2) return finished;
  const half = Math.floor(finished.total / 2);
  return reads === 0
    ? {
        ...finished,
        status: 'queued',
        processed: 0,
        created: 0,
        categoriesCreated: 0,
        startedAt: null,
        finishedAt: null,
      }
    : {
        ...finished,
        status: 'running',
        processed: half,
        created: half,
        categoriesCreated: 0,
        finishedAt: null,
      };
}

const isLiveRun = (run: MockRun) => run.reads < 2;

/** The groups answer: each service counted in one bucket, one row per (type, group), and the newest run without counting a read. */
function groupsOf(data: SuppliersState, supplierId: number): ServiceGroups {
  const rows = new Map<string, ServiceGroup>();
  const totals = emptyCounts();
  for (const item of data.catalogue.list()) {
    if (item.supplierId !== supplierId) continue;
    const key = JSON.stringify([item.type, item.remoteGroup]);
    const row = rows.get(key) ?? { type: item.type, remoteGroup: item.remoteGroup, ...emptyCounts() };
    rows.set(key, row);
    count(row, bucketOf(item));
    count(totals, bucketOf(item));
  }
  const newest = data.runs.filter((run) => run.finished.supplierId === supplierId).at(-1);
  return {
    groups: [...rows.values()].sort(byGroup),
    totals,
    latestRun: newest ? viewOf(newest) : null,
  };
}

// The items a scope would add now.
function candidatesOf(
  data: SuppliersState,
  supplierId: number,
  groups: readonly QuickAddGroupRef[] | null,
): MockItem[] {
  return data.catalogue
    .list()
    .filter(
      (item) =>
        item.supplierId === supplierId &&
        bucketOf(item) === 'addable' &&
        (groups === null || groups.some((group) => sameGroup(group, item))),
    );
}

// Reads the groups of a request body; null when it is not a list of `{ type, remoteGroup }` text pairs.
function groupsFromBody(value: unknown): QuickAddGroupRef[] | null {
  if (!Array.isArray(value)) return null;
  const refs: QuickAddGroupRef[] = [];
  for (const entry of value) {
    const { type, remoteGroup } = (entry ?? {}) as Record<string, unknown>;
    if (typeof type !== 'string' || typeof remoteGroup !== 'string') return null;
    if (!refs.some((ref) => sameGroup(ref, { type, remoteGroup }))) refs.push({ type, remoteGroup });
  }
  return refs;
}

/** The routes of Quick add: the groups listing, the start and the read of a run. */
export const quickAddHandlers: HttpHandler[] = [
  http.get(
    '*/admin/suppliers/:id/service-groups',
    secured(({ params, data }) => {
      const supplier = data.suppliers.find(String(params.id));
      if (!supplier) return notFound('supplier', params.id);
      return HttpResponse.json(groupsOf(data, supplier.id));
    }),
  ),

  http.post(
    '*/admin/suppliers/:id/quick-add',
    secured(async ({ request, params, data, body }) => {
      const supplier = data.suppliers.find(String(params.id));
      if (!supplier) return notFound('supplier', params.id);
      const input = await body();
      // `publish` needs storefront:publish as well as catalog:create (plan 5.5): the controller checks it with `grants`.
      if (input.publish !== undefined) {
        const forbidden = await denied(request, 'storefront:publish');
        if (forbidden) return forbidden;
      }
      const scope = input.scope;
      if (scope !== 'all' && scope !== 'groups') {
        return invalid([{ field: 'scope', message: 'Choose to add all services or some groups.' }]);
      }
      const named = scope === 'groups' ? groupsFromBody(input.groups) : [];
      if (named === null || (scope === 'groups' && named.length === 0)) {
        return invalid([{ field: 'groups', message: 'Pick at least one group.' }]);
      }
      if (named.length > MAX_GROUPS) {
        return invalid([{ field: 'groups', message: 'Pick at most 500 groups, or add all.' }]);
      }
      const serviceStatus = input.serviceStatus === 'disabled' ? 'disabled' : 'active';
      const asked = input.publish;
      if (
        asked !== undefined &&
        !(
          typeof asked === 'object' &&
          asked !== null &&
          'listed' in asked &&
          typeof asked.listed === 'boolean'
        )
      ) {
        return invalid([
          { field: 'publish', message: 'Send publish as { listed: true } or { listed: false }.' },
        ]);
      }
      const publish = asked === undefined ? null : (asked as { listed: boolean });
      if (publish && serviceStatus === 'disabled') {
        return invalid([{ field: 'publish', message: 'Services added switched off cannot go on the shop.' }]);
      }
      if (publish && !(await anyRetailRuleActive())) {
        return invalid([{ field: 'publish', message: 'Set a retail pricing rule first.' }]);
      }

      if (supplier.status === 'disabled') {
        return problem(
          409,
          'SUPPLIER_DISABLED',
          `${supplier.name} is disabled`,
          'Enable the supplier first.',
        );
      }
      if (data.runs.some((run) => run.finished.supplierId === supplier.id && isLiveRun(run))) {
        return problem(
          409,
          'JOB_ALREADY_RUNNING',
          'A quick add is already running',
          'A quick add for this supplier is already running.',
        );
      }
      const items = candidatesOf(data, supplier.id, scope === 'all' ? null : named);
      if (items.length === 0) {
        return invalid([
          {
            field: 'scope',
            message:
              'Nothing to add: every service in this scope is already in the console, no longer available or of a type that cannot be imported.',
          },
        ]);
      }

      // A category is new when no service of that type and group was imported before.
      const known = new Set(
        data.catalogue
          .list()
          .filter((item) => item.imported)
          .map((item) => JSON.stringify([item.type, item.remoteGroup])),
      );
      const fresh = new Set(
        items.map((item) => JSON.stringify([item.type, item.remoteGroup])).filter((key) => !known.has(key)),
      );
      items.forEach((item) => createFromItem(data, item, serviceStatus));

      const now = new Date().toISOString();
      const finished: QuickAddRun = {
        id: data.runs.length + 1,
        supplierId: supplier.id,
        scope,
        groups: named,
        serviceStatus,
        publish: publish === null ? 'none' : publish.listed ? 'listed' : 'unlisted',
        status: 'succeeded',
        total: items.length,
        processed: items.length,
        created: items.length,
        skipped: 0,
        failed: 0,
        categoriesCreated: fresh.size,
        failures: [],
        error: null,
        requestedBy: 1,
        createdAt: now,
        startedAt: now,
        finishedAt: now,
      };
      const run: MockRun = { finished, reads: 0 };
      data.runs.push(run);
      await handOverQuickAdd(finished.id, finished.created, publish === null ? null : publish.listed);
      return HttpResponse.json(viewOf(run), { status: 202 });
    }),
  ),

  http.get(
    '*/admin/suppliers/:id/quick-add/:runId',
    secured(({ params, data }) => {
      const run = data.runs.find(
        (candidate) =>
          candidate.finished.id === Number(params.runId) &&
          candidate.finished.supplierId === Number(params.id),
      );
      if (!run) return notFound('quick add', params.runId);
      run.reads += 1;
      return HttpResponse.json(viewOf(run));
    }),
  ),
];
