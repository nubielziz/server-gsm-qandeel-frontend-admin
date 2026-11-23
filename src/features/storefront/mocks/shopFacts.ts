// A read-only view of what the storefront mock knows about one service, for the Catalog join of the services mock (`GET /admin/services`):
// its shop page, the shop price and who wrote it, whether a price proposal waits, and its latest refused publish row. It changes no store
// and never reads the services or suppliers mocks.
import type { Id, IsoDateTime, Money } from '@/lib/api';
import { toMoney } from '@/mocks/seed';
import type { RetailPriceSource } from '../types';
import { ruleLabel } from './pricingDto';
import { storefrontStore } from './store';
import type { Stores } from './types';

/** The latest refused publish row of a service that has no shop page at all (what the server calls `publishFailure`). */
export type MockPublishFailure = { runId: Id; reason: string; detail: string | null; at: IsoDateTime };

/** What the storefront mock says about one service. */
export type ShopFacts = {
  /** The shop page's id, or `null` when the service has none. */
  listingId: Id | null;
  /** The shop page exists and is switched on. */
  isListed: boolean;
  /** The shop page says the service can never go on the public site: the mock's stand-in for "the category is not open to shop buyers". */
  locked: boolean;
  retailPrice: Money | null;
  retailPriceSource: RetailPriceSource | null;
  retailPriceRule: { id: Id; label: string } | null;
  /** An unresolved `proposed` price change exists for the service, whether or not it has a shop price. */
  proposalWaiting: boolean;
  publishFailure: MockPublishFailure | null;
};

type Attempt = {
  runId: number;
  itemId: number;
  at: IsoDateTime;
  refused: boolean;
  reason: string | null;
  detail: string | null;
};

/** The latest attempt with a result of each service, across every run: the newest time, then the newest run, then the newest row. */
function latestAttempts(stores: Stores): Map<number, Attempt> {
  const latest = new Map<number, Attempt>();
  for (const { run, items } of stores.publish.runs.list()) {
    const at = run.finishedAt ?? run.startedAt ?? run.createdAt;
    for (const item of items) {
      if (item.result === null) continue;
      const attempt: Attempt = {
        runId: run.id,
        itemId: item.id,
        at,
        refused: item.result === 'refused',
        reason: item.resultReason,
        detail: item.resultDetail,
      };
      const was = latest.get(item.serviceId);
      const newer =
        !was ||
        attempt.at > was.at ||
        (attempt.at === was.at &&
          (attempt.runId > was.runId || (attempt.runId === was.runId && attempt.itemId > was.itemId)));
      if (newer) latest.set(item.serviceId, attempt);
    }
  }
  return latest;
}

/**
 * The storefront facts of any service by id, read from the stores as they are when this is called (so a switch, a price or an applied
 * run made a moment ago shows). Call it once per request and use the function for every row.
 */
export async function shopFactsReader(): Promise<(serviceId: number) => ShopFacts> {
  const stores = await storefrontStore();
  const listings = new Map(stores.listings.list().map((row) => [row.serviceId, row]));
  const waiting = new Set(
    stores.pricing.changes
      .list()
      .filter((change) => change.kind === 'proposed' && change.waiting && change.resolvedAt === null)
      .map((change) => change.serviceId),
  );
  const attempts = latestAttempts(stores);
  return (serviceId) => {
    const listing = listings.get(serviceId);
    const retail = stores.retail.get(serviceId) ?? null;
    const written = stores.pricing.sources.get(serviceId);
    const rule = written?.ruleId == null ? undefined : stores.pricing.rules.find(written.ruleId);
    const last = attempts.get(serviceId);
    return {
      listingId: listing?.id ?? null,
      isListed: listing?.isListed ?? false,
      locked: listing !== undefined && listing.lockedReason !== null,
      retailPrice: retail === null ? null : toMoney(retail),
      retailPriceSource: retail === null ? null : (written?.source ?? 'manual'),
      retailPriceRule:
        retail !== null && written?.source === 'rule' && rule
          ? { id: rule.id, label: ruleLabel(stores, rule) }
          : null,
      proposalWaiting: waiting.has(serviceId),
      // The latest row with a result was refused and the service never got a shop page (a later row of any other result clears it).
      publishFailure:
        last?.refused && listing === undefined
          ? { runId: last.runId, reason: last.reason ?? 'failed', detail: last.detail, at: last.at }
          : null,
    };
  };
}
