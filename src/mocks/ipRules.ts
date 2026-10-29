// Mock IP rules, taken from the demo's `ipRules` (allowed offices, a few blocks added by the risk engine and by hand).
import type { IpRuleKind, IpRuleSource, IpScope } from '@/features/access';
import { Collection } from './db';
import { demoNumericId, demoRows, loadDemoState, toIso } from './seed';
import { demoStaffIds } from './staff';

/** A rule of the demo seed, as the demo stores it. */
type DemoIpRule = {
  id: string;
  kind: IpRuleKind;
  cidr: string;
  scope: IpScope;
  label: string;
  reason: string;
  source: IpRuleSource;
  by: string;
  ts: number;
  expires: number | null;
  hits: number;
  lastHit: number | null;
};

/** An IP rule as the mock keeps it (API-style names; the creator by staff id, null for the risk engine). */
export type MockIpRule = {
  id: number;
  kind: IpRuleKind;
  scope: IpScope;
  cidr: string;
  label: string;
  reason: string;
  source: IpRuleSource;
  expiresAt: string | null;
  hitCount: number;
  lastHitAt: string | null;
  createdAt: string;
  createdBy: number | null;
};

let store: Promise<Collection<MockIpRule>> | undefined;

/** The IP rule collection, seeded from the demo on first use. */
export function ipRuleStore(): Promise<Collection<MockIpRule>> {
  store ??= loadDemoState().then((state) => {
    const staffIds = demoStaffIds(state);
    return new Collection(
      demoRows<DemoIpRule>(state, 'ipRules').map((rule): MockIpRule => ({
        id: demoNumericId(rule.id),
        kind: rule.kind,
        scope: rule.scope,
        cidr: rule.cidr,
        label: rule.label,
        reason: rule.reason,
        source: rule.source,
        expiresAt: rule.expires ? toIso(rule.expires) : null,
        hitCount: rule.hits,
        lastHitAt: rule.lastHit ? toIso(rule.lastHit) : null,
        createdAt: toIso(rule.ts),
        createdBy: rule.source === 'auto' ? null : (staffIds.get(rule.by) ?? null),
      })),
    );
  });
  return store;
}

/** Drops the collection so the next use re-seeds it (tests). */
export function resetIpRuleStore(): void {
  store = undefined;
}
