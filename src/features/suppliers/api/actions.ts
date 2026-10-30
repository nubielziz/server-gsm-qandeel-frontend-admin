// The two supplier actions of the page header: Test connection and Sync now (`POST /admin/suppliers/:id/test|sync`). Port the
// `sup-test` and `sup-sync` actions of 44-p-suppliers.js, which only faked a wait. The server makes the real call to the
// supplier; the console shows what it answers.
import { apiPost, pathOf, type ApiInit, type Id } from '@/lib/api';
import type { SyncResult, TestConnectionResult } from '../types';

/**
 * Tests the connection with the supplier's `accountinfo` call and logs it. Use it after connecting a supplier, after
 * changing its key, and when its health looks wrong. A failed test comes as `ok: false` with the failure text, or as an
 * error response; both are shown as the server worded them.
 * Assumed contract: no body, answer `TestConnectionResult`.
 * @route POST /admin/suppliers/:id/test
 */
export function testSupplier(id: Id, init?: ApiInit): Promise<TestConnectionResult> {
  return apiPost<TestConnectionResult>(pathOf('/admin/suppliers/:id/test', { id }), undefined, init);
}

/**
 * Syncs the supplier now: copies its service list and reads the balance. This is also how the prepaid balance gets
 * updated, because the console has no route to record a top-up (the balance comes from the supplier). The server
 * refuses when the supplier is disabled or cannot be reached, and says why.
 * Assumed contract: no body, answer `SyncResult`.
 * @route POST /admin/suppliers/:id/sync
 */
export function syncSupplier(id: Id, init?: ApiInit): Promise<SyncResult> {
  return apiPost<SyncResult>(pathOf('/admin/suppliers/:id/sync', { id }), undefined, init);
}
