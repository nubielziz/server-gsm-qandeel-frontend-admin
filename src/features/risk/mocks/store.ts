// The risk mocks' state: loaded from the demo on first use, changed in place by the handlers, dropped by `reset` between
// tests. Also the shapes the queue route answers with, built from the assessments. Mock data only (decision 014).
import { loadDemoState } from '@/mocks/seed';
import type { DecidedOrder, HeldOrder, RiskQueue } from '../types';
import { buildRiskState, type MockAssessment, type RiskMockState } from './seed';

let state: Promise<RiskMockState> | undefined;

/** The state, seeded from the demo on first use. */
export function riskState(): Promise<RiskMockState> {
  state ??= loadDemoState().then(buildRiskState);
  return state;
}

/** Drops the state so the next use re-seeds it (tests). */
export function resetRiskState(): void {
  state = undefined;
}

/** Held means the rules asked for a person and nobody has decided yet (the demo's `isHeld`, without the order's own state). */
export const isHeld = (assessment: MockAssessment): boolean =>
  assessment.decision === 'review' && assessment.reviewedAt === null;

const DAY_MS = 86_400_000;
const RECENT = 6;

/** A held order as the queue sends it: the assessment without the mock's own fields. */
export function toHeld(assessment: MockAssessment): HeldOrder {
  const {
    id: _id,
    decision: _decision,
    reviewedBy: _by,
    reviewedAt: _at,
    outcome: _outcome,
    ...held
  } = assessment;
  return held;
}

function toDecided(assessment: MockAssessment): DecidedOrder {
  return {
    orderId: assessment.orderId,
    score: assessment.score,
    customer: { id: assessment.customer.id, name: assessment.customer.name },
    capturedAmount: assessment.capturedAmount,
    currency: assessment.currency,
    fxRate: assessment.fxRate,
    outcome: assessment.outcome ?? 'approved',
    reviewedBy: assessment.reviewedBy,
    reviewedAt: assessment.reviewedAt ?? assessment.paidAt,
  };
}

/** The queue's answer: held orders (oldest first), the 30-day figures and the latest decisions. */
export function buildQueue(rows: readonly MockAssessment[], now = Date.now()): RiskQueue {
  const held = rows
    .filter(isHeld)
    .sort((a, b) => Date.parse(a.paidAt) - Date.parse(b.paidAt))
    .map(toHeld);
  const decided = rows
    .filter((row) => row.reviewedAt !== null)
    .sort((a, b) => Date.parse(b.reviewedAt as string) - Date.parse(a.reviewedAt as string));
  const lately = decided.filter((row) => now - Date.parse(row.reviewedAt as string) < 30 * DAY_MS);
  const heldEver = rows.filter((row) => row.decision === 'review').length;
  return {
    held,
    stats: {
      decided30d: lately.length,
      approved30d: lately.filter((row) => row.outcome === 'approved').length,
      refunded30d: lately.filter((row) => row.outcome === 'refunded').length,
      heldShare: Math.round((heldEver / Math.max(1, rows.length)) * 1000) / 10,
    },
    recent: decided.slice(0, RECENT).map(toDecided),
  };
}
