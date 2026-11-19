// Quick add: add a supplier's services by whole group, or all of them, in the background (`/admin/suppliers/:id/service-groups`
// and `/admin/suppliers/:id/quick-add*`). The demo has no such screen. These three routes are backend additions, not in the map
// (backend B214), so every shape is an assumed contract that follows the plan of feature 26.
import { apiGet, apiPost, pathOf, type ApiInit, type Id } from '@/lib/api';
import type { QuickAddBody, QuickAddRun, ServiceGroups } from '../types';

/**
 * The supplier's services counted by group: for each `(type, remoteGroup)` how many can be added now, are already in the
 * console, are no longer listed by the supplier, or are of a type the console cannot sell. It also carries the supplier's
 * newest run (or `null`), so a dialog opened while a run is going can show it. Not paged.
 * Assumed contract: answer `ServiceGroups` (backend addition, B214).
 * @route GET /admin/suppliers/:id/service-groups
 */
export function listServiceGroups(id: Id, init?: ApiInit): Promise<ServiceGroups> {
  return apiGet<ServiceGroups>(pathOf('/admin/suppliers/:id/service-groups', { id }), undefined, init);
}

/**
 * Starts a quick add: the picked groups (1 to 500), or every service of the supplier. The server builds the list, creates only
 * what is not in the console yet, and answers at once with the queued run; the work goes on in the background. It refuses with
 * `JOB_ALREADY_RUNNING` while another run of the supplier is live, `SUPPLIER_DISABLED`, and a 422 (`scope`) when nothing is left to add.
 * With `publish: { listed: true }` (the tick box "Also put them on the shop", feature 31) the server also puts what the run added on the
 * shop when it ends, through an automatic publish run; it refuses `publish` with a 422 on that field (`needs_active` for services added
 * switched off, `no_rule` when no retail price rule is active) and with a 403 naming `storefront:publish`.
 * Assumed contract: body `QuickAddBody`, answer `QuickAddRun` with status 202 (backend additions, B214 and B231).
 * @route POST /admin/suppliers/:id/quick-add
 */
export function startQuickAdd(id: Id, body: QuickAddBody, init?: ApiInit): Promise<QuickAddRun> {
  return apiPost<QuickAddRun>(pathOf('/admin/suppliers/:id/quick-add', { id }), body, init);
}

/**
 * Reads one run with its progress. The console asks again while the run is `queued` or `running`. A run that sent no sign of
 * life for 5 minutes reads as `failed`.
 * Assumed contract: answer `QuickAddRun` (backend addition, B214).
 * @route GET /admin/suppliers/:id/quick-add/:runId
 */
export function getQuickAddRun(id: Id, runId: Id, init?: ApiInit): Promise<QuickAddRun> {
  return apiGet<QuickAddRun>(pathOf('/admin/suppliers/:id/quick-add/:runId', { id, runId }), undefined, init);
}
