// The dev mock routes of the audit feature (found by src/mocks/handlers/index.ts): the audit log, over a state built from
// the demo seed. Deletable with the rest of the mock layer; the app never loads it in production.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { auditHandlers } from './routes';
import { resetAuditState } from './store';

export const mocks: FeatureMocks = {
  handlers: auditHandlers,
  reset: resetAuditState,
};
