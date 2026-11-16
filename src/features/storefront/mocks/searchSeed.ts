// The seed of the Search tab's mock routes: the owner's five synonym rules (backend plan §4.6), one pinned-results rule for
// `unlock` on a listed English service, one hidden term, and an index that is running with 14 documents. Dates are relative to now.
import { Collection } from '@/mocks/db';
import type { HiddenTerm, SearchSynonym } from '../types';
import type { MockIndex, MockListing, MockPin, SearchStores } from './types';

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** The five rules the backend migration inserts: frp, icloud, unlock, imei check, kg lock. */
function synonymRows(now: number): SearchSynonym[] {
  const sets: string[][] = [
    ['frp', 'google account lock', 'frp lock'],
    ['icloud', 'activation lock', 'icloud lock'],
    ['unlock', 'network unlock', 'carrier unlock', 'sim unlock'],
    ['imei check', 'blacklist check', 'gsma check', 'clean check'],
    ['kg lock', 'knox guard', 'knox guard lock'],
  ];
  return sets.map((terms, index) => ({
    id: index + 1,
    kind: 'multi',
    root: null,
    terms,
    isEnabled: true,
    note: index === 0 ? 'Visitors search for the old name and the new one.' : '',
    createdAt: new Date(now - 20 * DAY).toISOString(),
    updatedAt: new Date(now - (20 - index * 2) * DAY).toISOString(),
  }));
}

/** One rule: a search that contains "unlock" shows the first listed English service that mentions unlocking first. */
function pinRows(listings: readonly MockListing[], now: number): MockPin[] {
  const listed = listings.filter((row) => row.locale === 'en' && row.isListed);
  const pick = listed.find((row) => /unlock/i.test(row.publicTitle)) ?? listed[0];
  if (!pick) return [];
  return [
    {
      id: 1,
      query: 'unlock',
      match: 'contains',
      pinned: [{ serviceId: pick.serviceId, position: 1 }],
      hidden: [],
      startsAt: null,
      endsAt: null,
      isEnabled: true,
      note: 'Our best seller for the search everyone starts with.',
      createdAt: new Date(now - 6 * DAY).toISOString(),
      updatedAt: new Date(now - 2 * DAY).toISOString(),
    },
  ];
}

/** A term staff hid from the popular searches. */
function hiddenRows(now: number): HiddenTerm[] {
  return [
    {
      id: 1,
      term: 'free',
      note: 'Not a service, only a wish.',
      createdAt: new Date(now - 4 * DAY).toISOString(),
    },
  ];
}

/** An engine that answers, with 14 documents of 14 expected (the backend seed's English listings), and nothing waiting. */
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
export function buildSearchStores(listings: readonly MockListing[], now: number): SearchStores {
  return {
    synonyms: new Collection(synonymRows(now)),
    pins: new Collection(pinRows(listings, now)),
    hidden: new Collection(hiddenRows(now)),
    index: freshIndex(now),
  };
}
