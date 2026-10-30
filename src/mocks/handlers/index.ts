// Every mock handler of the app: the shared ones below, then each feature's own mocks, found in
// `src/features/<name>/mocks/index.ts` (export `mocks: FeatureMocks`). Most specific routes first: a generic `/:id`
// handler would otherwise answer `/export` or `/check`.
import type { RequestHandler } from 'msw';
import type { FeatureMocks } from '../featureMocks';
import { resetIpRuleStore } from '../ipRules';
import { resetLedgerStore } from '../ledger';
import { resetOrderStore } from '../orders';
import { resetRoleStore } from '../roles';
import { resetSession, sessionHandlers } from '../session';
import { resetSessionStore } from '../sessions';
import { resetSettingsStore } from '../settings';
import { resetStaffStore } from '../staff';
import { accessHandlers } from './access';
import { ledgerHandlers } from './ledger';
import { ordersHandlers } from './orders';
import { settingsHandlers } from './settings';
import { systemHandlers } from './system';

// Mocks that live in the feature folders (features built in parallel keep everything inside their folder).
const featureMocks: FeatureMocks[] = Object.entries(
  import.meta.glob<{ mocks?: FeatureMocks }>('../../features/*/mocks/index.ts', { eager: true }),
).map(([file, module]) => {
  if (!module.mocks) throw new Error(`${file} must export \`mocks\``);
  return module.mocks;
});

export const handlers: RequestHandler[] = [
  ...sessionHandlers,
  ...systemHandlers,
  ...accessHandlers,
  ...ordersHandlers,
  ...ledgerHandlers,
  ...settingsHandlers,
  ...featureMocks.flatMap((feature) => feature.handlers),
];

/** Puts all stateful mock stores back to their seed. For tests; add each feature's reset here. */
export function resetMockState(): void {
  resetSession();
  resetStaffStore();
  resetRoleStore();
  resetIpRuleStore();
  resetSessionStore();
  resetSettingsStore();
  resetOrderStore();
  resetLedgerStore();
  for (const feature of featureMocks) feature.reset?.();
}
