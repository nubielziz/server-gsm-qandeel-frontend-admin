// The seed of the Search tab's mock routes: an index that is running with 14 documents. Dates are relative to now.
import type { MockIndex, SearchStores } from './types';

const HOUR = 3_600_000;

/** An engine that answers, with 14 documents of 14 expected (the backend seed's listings), and nothing waiting. */
export function freshIndex(now: number): MockIndex {
  return {
    rebuildStartedAt: null,
    status: {
      engine: { status: 'ok', version: '30.2', memoryBytes: 48_234_496 },
      schemaVersion: 1,
      collection: 'gsm_services_v1_20261116034000',
      documents: 14,
      expectedDocuments: 14,
      lastSyncAt: new Date(now - 2 * 60_000).toISOString(),
      lastReconcileAt: new Date(now - 11 * 60_000).toISOString(),
      lastRebuildAt: new Date(now - 14 * HOUR).toISOString(),
      lastTermsBuildAt: new Date(now - 40 * 60_000).toISOString(),
      queued: 0,
      failed: 0,
      rebuild: { running: false, startedAt: null },
      lastError: null,
    },
  };
}

/** The stores of the Search tab for a fresh seed. */
export function buildSearchStores(now: number): SearchStores {
  return { index: freshIndex(now) };
}
