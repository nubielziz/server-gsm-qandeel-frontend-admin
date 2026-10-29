// Every mock handler of the app. Features append theirs here (`...ordersHandlers`), most specific routes first:
// a generic `/:id` handler would otherwise answer `/export` or `/check`.
import type { RequestHandler } from 'msw';
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
import { orderLookupHandlers } from './ordersLookups';
import { settingsHandlers } from './settings';
import { systemHandlers } from './system';

export const handlers: RequestHandler[] = [
  ...sessionHandlers,
  ...systemHandlers,
  ...accessHandlers,
  ...ordersHandlers,
  ...orderLookupHandlers,
  ...ledgerHandlers,
  ...settingsHandlers,
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
}
