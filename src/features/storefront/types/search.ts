// Types of the "Search" tab: the index status of the shop's search engine (backend feature 29, `GET /admin/search/index`). The map has
// no such route: the shape is the backend plan's admin wire (`docs/briefs/29-search-typesense.md` §5.1 and §6), typed by hand. The
// synonym, pinned results, hidden terms, report and preview types were retired with their routes (decision 025).

import type { IsoDateTime } from '@/lib/api';

/** The state of the search engine itself. */
export type EngineStatus = 'ok' | 'down' | 'not_ready' | 'disabled';

/** `GET /admin/search/index`: the engine, how complete the index is, the last runs of each job and the last error. */
export type SearchIndexStatus = {
  engine: { status: EngineStatus; version: string | null; memoryBytes: number | null };
  schemaVersion: number;
  collection: string | null;
  documents: number;
  expectedDocuments: number;
  lastSyncAt: IsoDateTime | null;
  lastReconcileAt: IsoDateTime | null;
  lastRebuildAt: IsoDateTime | null;
  lastTermsBuildAt: IsoDateTime | null;
  queued: number;
  failed: number;
  rebuild: { running: boolean; startedAt: IsoDateTime | null };
  lastError: string | null;
};
