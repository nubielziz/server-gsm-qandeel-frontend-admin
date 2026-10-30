// The shapes of the demo's own data that the risk mocks read (`S.customers`, `S.orders[].risk`, `S.imeiChecks`, `S.risk`), as
// the demo stores them. Mock data only: they exist so the mapping in seed.ts can be read against the demo in one place.
import type {
  BlockKind,
  BlockSource,
  CheckKind,
  CheckResult,
  CheckSource,
  PaymentMethod,
  RiskOutcome,
} from '../types';

export type DemoNamed = { id: string; name: string };
export type DemoCustomer = DemoNamed & {
  email: string;
  country: string;
  risk: 'low' | 'med' | 'high';
};
export type DemoRiskOrder = {
  id: string;
  cid?: string;
  sid: string;
  sup: string;
  input: string;
  device?: string | null;
  created: number;
  gross: number;
  cur: string;
  fx: number;
  pay: { method: PaymentMethod };
  risk: {
    score: number;
    decision: 'allow' | 'review';
    signals: string[];
    reviewedBy: string | null;
    reviewedAt: number | null;
    outcome: RiskOutcome | null;
  };
};
export type DemoCheck = {
  id: string;
  ts: number;
  imei: string;
  brand: string;
  model: string;
  kind: CheckKind;
  status: CheckResult;
  source: CheckSource;
  country: string;
  cost: number;
  converted: string | null;
};
export type DemoBlock = {
  id: string;
  kind: BlockKind;
  display: string;
  reason: string;
  source: BlockSource;
  by: string;
  ts: number;
};
export type DemoRule = { id: string; on: boolean; value: number | null };
