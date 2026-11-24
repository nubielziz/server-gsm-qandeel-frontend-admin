// Every mock handler of the app: the shared ones below, then each feature's own mocks, found in
// `src/features/<name>/mocks/index.ts` (export `mocks: FeatureMocks`). Most specific routes first: a generic `/:id`
// handler would otherwise answer `/export` or `/check`.
import type { RequestHandler } from 'msw';
import { isRetiredFeatureMock, type FeatureMocks } from '../featureMocks';
import { resetIpRuleStore } from '../ipRules';
import { resetLedgerStore } from '../ledger';
import { resetOrderStore } from '../orders';
import { resetRoleStore } from '../roles';
import { resetMockScenario } from '../scenario';
import { resetSession, sessionHandlers } from '../session';
import { resetSessionStore } from '../sessions';
import { resetSettingsStore } from '../settings';
import { resetStaffStore } from '../staff';
import { accessHandlers } from './access';
import { ledgerHandlers } from './ledger';
import { ordersHandlers } from './orders';
import { settingsHandlers } from './settings';
import { systemHandlers } from './system';

// Mocks that live in the feature folders (features built in parallel keep everything inside their folder). The merchants and
// customers mocks serve no route any more: the accounts mocks serve theirs (and answer 410 for the retired customer routes). Their
// stores are still put back to the seed between tests, because the finance mocks still read the old customer top-ups.
const loaded = Object.entries(
  import.meta.glob<{ mocks?: FeatureMocks }>('../../features/*/mocks/index.ts', { eager: true }),
).map(([file, module]) => {
  if (!module.mocks) throw new Error(`${file} must export \`mocks\``);
  return { file, mocks: module.mocks };
});
const featureMocks: FeatureMocks[] = loaded.map((feature) => feature.mocks);
const featureHandlers: RequestHandler[] = loaded
  .filter((feature) => !isRetiredFeatureMock(feature.file))
  .flatMap((feature) => feature.mocks.handlers);

export const handlers: RequestHandler[] = [
  ...sessionHandlers,
  ...systemHandlers,
  ...accessHandlers,
  ...ordersHandlers,
  ...ledgerHandlers,
  ...settingsHandlers,
  ...featureHandlers,
];

/** Puts all stateful mock stores back to their seed. For tests; add each feature's reset here. */
export function resetMockState(): void {
  resetMockScenario();
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
