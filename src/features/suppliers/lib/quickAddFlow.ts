// The whole-groups path of the Add services flow, as plain rules and words: which step of the step line each stage shows, what the
// shop switch may do, how the shop price rules are described, and what a refused start says. Pure, so the components only show
// what these return. The server decides what is added and at what price; nothing here works out a figure.
import { errorText } from '@/components/ui';
import { isApiError } from '@/lib/api';
import type { QuickAddServiceStatus } from '../types';
import { publishLock } from './quickAddPublish';

/** Where the path is: picking groups, choosing how to add them, or following the run. The last two are the "Finish" step. */
export type FlowStage = 'prices' | 'finish' | 'progress';

/** The id of the step in the step line that a stage belongs to. */
export function stepOf(stage: FlowStage): 'prices' | 'finish' {
  return stage === 'prices' ? 'prices' : 'finish';
}

/**
 * What is known about the shop price rules: still being read, at least one is active, none is, or it cannot be told here (the
 * role may not read the rules, or the read failed; the server then decides when the services are put on the shop).
 */
export type ShopRule = 'loading' | 'active' | 'none' | 'unknown';

/** Why the shop switch is locked while no shop price rule is active. */
export const NO_RULE_REASON = 'No shop price rule is active. Make one first, then put them on the shop.';

/** Why the shop switch waits while the rules are being read. */
export const RULE_LOADING_REASON = 'Checking the shop price rules…';

/** The hint under the shop switch: what the server does when the run ends, and where the services that need a look wait. */
export const SHOP_SWITCH_HINT =
  'When the run ends, the services that are ready go on the shop at the prices of the shop price rules. The ones that need a look wait in their publish run.';

/** The shop switch as it shows: whether it is on, and the reason it cannot be used (also its title), if any. */
export type ShopSwitch = { checked: boolean; lock: string | undefined };

/**
 * The reason the shop switch is locked, or `undefined` when it can be used. Switched off services come first (they can never be
 * listed), then a role that cannot publish, then the rules: none active, or still being read. A rule that cannot be read does not
 * lock: the server checks it when the run is started.
 */
export function shopSwitchLock(input: {
  serviceStatus: QuickAddServiceStatus;
  canPublish: boolean;
  rule: ShopRule;
}): string | undefined {
  const base = publishLock(input.serviceStatus, input.canPublish);
  if (base !== undefined) return base;
  if (input.rule === 'none') return NO_RULE_REASON;
  if (input.rule === 'loading') return RULE_LOADING_REASON;
  return undefined;
}

/**
 * The shop switch. It is on by default only when it can be used and a rule is known to be active; a choice the person made
 * (`choice` is true or false, null until they touch it) wins while the switch is usable. A locked switch is always off.
 */
export function shopSwitch(input: {
  serviceStatus: QuickAddServiceStatus;
  canPublish: boolean;
  rule: ShopRule;
  choice: boolean | null;
}): ShopSwitch {
  const lock = shopSwitchLock(input);
  if (lock !== undefined) return { checked: false, lock };
  return { checked: input.choice ?? input.rule === 'active', lock: undefined };
}

/** What the review says about the shop price, by what is known about the rules. */
export function ruleLine(rule: ShopRule): string {
  const head = 'Shop price: set by the shop price rules.';
  switch (rule) {
    case 'active':
      return `${head} A rule is active.`;
    case 'none':
      return `${head} No rule is active, so nothing can go on the shop until one is made.`;
    case 'loading':
      return `${head} Checking whether a rule is active…`;
    default:
      return `${head} Whether a rule is active is checked by the server when they are put on the shop.`;
  }
}

/** What a refused start says: the first field message the server gave (the `scope` one for nothing to add), else its text. */
export function refusalText(failure: unknown): string {
  if (isApiError(failure)) {
    const message = Object.values(failure.fieldErrors).flat()[0];
    if (message) return message;
  }
  return errorText(failure);
}
