// Puts the dashboard payload together for the dev mock, the way the real server would: one call, every panel from the same
// moment. Sections the scope does not use are null (revenue split only for All, storefront parts not for Merchants).
import { toIso } from '@/mocks/seed';
import type { Dashboard, DashboardParams } from '../types';
import { attentionItems } from './attention';
import { ordersByType, revenueByChannel } from './charts';
import { navCounts } from './navCounts';
import { queuesByType, supplierHealth } from './queues';
import { periodStats } from './stats';
import { storefrontSummary, topCustomers } from './storefront';
import type { World } from './world';

/** The whole payload for a channel and period, every section worked out from the same `world`. */
export function buildDashboard(world: World, { scope, days }: DashboardParams): Dashboard {
  return {
    generatedAt: toIso(world.now),
    stats: periodStats(world, scope, days),
    attention: attentionItems(world, scope),
    queues: queuesByType(world, scope),
    suppliers: supplierHealth(world),
    ordersByType: ordersByType(world, scope),
    revenueByChannel: scope === 'all' ? revenueByChannel(world) : null,
    storefront: scope === 'b2b' ? null : storefrontSummary(world),
    topCustomers: scope === 'b2b' ? null : topCustomers(world, days),
    navCounts: navCounts(world),
  };
}
