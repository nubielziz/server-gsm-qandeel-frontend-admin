// The dev mock routes of the refunds feature (found by src/mocks/handlers/index.ts): refunds, disputes and the storefront
// payments report, over a state built from the demo seed. Deletable with the rest of the mock layer; the app never loads it in production.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { disputeHandlers } from './disputeRoutes';
import { refundHandlers } from './refundRoutes';
import { reportHandlers } from './reportRoutes';
import { resetRefundsState } from './store';

export const mocks: FeatureMocks = {
  handlers: [...reportHandlers, ...disputeHandlers, ...refundHandlers],
  reset: resetRefundsState,
};
