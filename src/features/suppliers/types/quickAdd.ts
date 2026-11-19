// Types of Quick add (feature 26): the supplier's service groups with their counts, the body that starts a run, and the run the
// console follows. The three routes are backend additions, not in the map (backend B214), so every shape is an assumed
// contract that follows the plan of feature 26.
import type { Id, IsoDateTime } from '@/lib/api';

/**
 * A group is the pair `(type, remoteGroup)` exactly as the server stores it (two types may share a group name). `remoteGroup`
 * can be an empty string: the import names that category "Imported". Every service is counted in exactly one bucket:
 * `imported`, else `unavailable`, else `unsupported`, else `addable`; `total` is the sum.
 */
export type ServiceGroup = {
  type: string;
  remoteGroup: string;
  total: number;
  addable: number;
  imported: number;
  /** No longer listed by the supplier. */
  unavailable: number;
  /** Of a type the console cannot sell. */
  unsupported: number;
};

/** The same five counts over the whole supplier. */
export type ServiceGroupTotals = Omit<ServiceGroup, 'type' | 'remoteGroup'>;

/** Where a run is. `failed` also covers a run that stopped without a word (no heartbeat for 5 minutes). */
export type QuickAddRunStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/** Whether the services of a run are added on sale or switched off. */
export type QuickAddServiceStatus = 'active' | 'disabled';

/**
 * Whether a run asked to put what it adds on the shop: `none`, `listed` (on the shop at once) or `unlisted` (created switched
 * off). Quick add's tick box sends `listed` only (feature 31, backend B231, MISMATCHES M10c).
 */
export type QuickAddPublish = 'none' | 'listed' | 'unlisted';

/** The `publish` member of the start body: the services that need no look go on the shop (`listed: true`) when the run ends. */
export type QuickAddPublishBody = { listed: boolean };

/** A group as a run or a request names it: the stored text, never trimmed. */
export type QuickAddGroupRef = Pick<ServiceGroup, 'type' | 'remoteGroup'>;

/** A service the run could not add. The server keeps at most 20. */
export type QuickAddFailure = { supplierServiceId: Id; name: string; reason: string };

/** One quick add run. `processed` is `created + skipped + failed`; `groups` is empty when the scope is `all`. */
export type QuickAddRun = {
  id: Id;
  supplierId: Id;
  scope: 'all' | 'groups';
  groups: QuickAddGroupRef[];
  serviceStatus: QuickAddServiceStatus;
  /** Whether the run asked to publish what it adds (backend B231); `none` for a run started without the tick box. */
  publish: QuickAddPublish;
  status: QuickAddRunStatus;
  total: number;
  processed: number;
  created: number;
  skipped: number;
  failed: number;
  categoriesCreated: number;
  failures: QuickAddFailure[];
  error: string | null;
  requestedBy: Id | null;
  createdAt: IsoDateTime;
  startedAt: IsoDateTime | null;
  finishedAt: IsoDateTime | null;
};

/** Answer of `GET /admin/suppliers/:id/service-groups`: one row per group, the totals and the supplier's newest run (or null). */
export type ServiceGroups = {
  groups: ServiceGroup[];
  totals: ServiceGroupTotals;
  latestRun: QuickAddRun | null;
};

/**
 * Body of `POST /admin/suppliers/:id/quick-add`. The console sends a scope, never ids: `all` takes no groups, `groups` takes 1
 * to 500. `serviceStatus` is left out for the server's default, on sale. `publish` is sent only when "Also put them on the shop"
 * is ticked, and only for services added on sale (the server refuses it for switched off ones).
 */
export type QuickAddBody =
  | { scope: 'all'; serviceStatus?: QuickAddServiceStatus; publish?: QuickAddPublishBody }
  | {
      scope: 'groups';
      groups: QuickAddGroupRef[];
      serviceStatus?: QuickAddServiceStatus;
      publish?: QuickAddPublishBody;
    };
