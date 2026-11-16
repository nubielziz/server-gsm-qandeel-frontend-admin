// Types of the "Search" tab: the synonyms, pinned results, hidden popular terms, the report, the preview and the index status
// of the shop's search engine (backend feature 29, routes under `/admin/search`). The map has no such routes: the shapes are
// the backend plan's admin wire (`docs/briefs/29-search-typesense.md` §5.1 and §6), typed by hand. The request bodies are
// assumed contracts (the plan fixes the answers, not the bodies); see HANDOFF.md.
import type { Id, IsoDateTime } from '@/lib/api';

/** `multi`: every term finds the others. `one_way`: a search for the root also finds the terms, not the other way round. */
export type SynonymKind = 'multi' | 'one_way';

/** One synonym rule as `GET /admin/search/synonyms` sends it. Terms are lower-case words or phrases. */
export type SearchSynonym = {
  id: Id;
  kind: SynonymKind;
  /** The word that expands, for a one-way rule; `null` for a multi-way one. */
  root: string | null;
  terms: string[];
  isEnabled: boolean;
  note: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/** Body of `POST /admin/search/synonyms`. `root` is required for `one_way` and left out for `multi`. */
export type CreateSynonymBody = {
  kind: SynonymKind;
  root?: string | null;
  terms: string[];
  isEnabled?: boolean;
  note?: string;
};

/** Body of `PATCH /admin/search/synonyms/:id`: any of the fields, at least one. */
export type UpdateSynonymBody = Partial<CreateSynonymBody>;

/** How a pin's query is compared with what the visitor typed: the whole search, or any search that contains the words. */
export type PinMatch = 'exact' | 'contains';

/** A service the pin puts at a position (1 to 10), with its title as the shop shows it (read by the server for display). */
export type PinnedService = { serviceId: Id; position: number; title: string };

/** A service the pin removes from the results of its query. */
export type HiddenService = { serviceId: Id; title: string };

/** One pinned-results rule as `GET /admin/search/pins` sends it. `startsAt` and `endsAt` are optional dates of the rule. */
export type SearchPin = {
  id: Id;
  query: string;
  match: PinMatch;
  pinned: PinnedService[];
  hidden: HiddenService[];
  startsAt: IsoDateTime | null;
  endsAt: IsoDateTime | null;
  isEnabled: boolean;
  note: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/**
 * Body of `POST /admin/search/pins`. `pinned` has at most 10 entries with distinct positions 1 to 10, `hidden` is the ids
 * of at most 50 services; every service must have a listed English listing (else 422). The answer carries the titles.
 */
export type CreatePinBody = {
  query: string;
  match: PinMatch;
  pinned: { serviceId: Id; position: number }[];
  hidden: Id[];
  startsAt?: IsoDateTime | null;
  endsAt?: IsoDateTime | null;
  isEnabled?: boolean;
  note?: string;
};

/** Body of `PATCH /admin/search/pins/:id`: any of the fields, at least one. */
export type UpdatePinBody = Partial<CreatePinBody>;

/** A search term kept out of the popular searches (`GET /admin/search/hidden-terms`). */
export type HiddenTerm = { id: Id; term: string; note: string; createdAt: IsoDateTime };

/** Body of `POST /admin/search/hidden-terms`. */
export type CreateHiddenTermBody = { term: string; note?: string };

/** The ranges the report offers, in days. */
export const REPORT_DAYS = [7, 30, 90] as const;
export type ReportDays = (typeof REPORT_DAYS)[number];

/** A search term with its counts over the range; `visitors` is an estimate of distinct visitors, never an address. */
export type ReportTerm = { term: string; searches: number; visitors: number; zeroResults: number };

/** A term that found nothing, with when it was last searched. */
export type ZeroResultTerm = { term: string; searches: number; lastSeen: IsoDateTime };

/** `GET /admin/search/report?days=`: totals, the 50 most searched terms and the 50 most frequent no-result terms. */
export type SearchReport = {
  days: number;
  totals: { searches: number; zeroResults: number; terms: number };
  topTerms: ReportTerm[];
  zeroResultTerms: ZeroResultTerm[];
};

/** A hit of the preview: where it stands and whether a pin put it there. */
export type PreviewHit = { serviceId: Id; title: string; position: number; pinned: boolean };

/** The query of `GET /admin/search/preview`: the text to rank, 1 to 200 characters. */
export type SearchPreviewQuery = { q: string };

/** `GET /admin/search/preview?q=`: the top 10 for a query as the shop would show them now, and the ids a rule hides. */
export type SearchPreview = {
  engine: 'typesense' | 'fallback';
  hits: PreviewHit[];
  hiddenIds: Id[];
};

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
