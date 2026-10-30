// The risk feature's dev mocks: the review queue with its decisions, the IMEI check log, the blocklist and the rules. The
// mock layer finds this file on its own (src/mocks/handlers/index.ts). Special routes come before the `/:id` ones.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { blocklistHandlers, checkHandlers } from './lists';
import { queueHandlers } from './queue';
import { rulesHandlers } from './rules';
import { resetRiskState } from './store';

export const mocks: FeatureMocks = {
  handlers: [...queueHandlers, ...rulesHandlers, ...checkHandlers, ...blocklistHandlers],
  reset: resetRiskState,
};
