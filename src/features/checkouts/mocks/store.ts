// The checkouts mock tables, built from the demo seed (`S.checkouts`, `S.services`, `S.imeiChecks`) and mapped to the API's row
// (decision 014). The demo has no consent flag on a checkout, so marketing consent is made up per checkout (about seven in ten agree);
// the demo's `recovery` word becomes `recoveryEmailedAt` (+ `orderId` when it was recovered) and `canRecover`. The email goes out
// masked, as the real server would send it; the full address stays in the mock for the search.
import { maskEmail } from '@/lib/format';
import { Collection } from '@/mocks/db';
import { demoNumericId, demoRows, loadDemoState, toIso, toMoney } from '@/mocks/seed';
import type { AbandonedCheckout } from '../types';

/** A checkout of the demo seed, as the demo stores it (the fields the mock uses). */
type DemoCheckout = {
  id: string;
  email: string;
  sid: string;
  gross: number;
  cur: string;
  created: number;
  recovery: 'none' | 'pending' | 'sent' | 'converted';
  status: 'open' | 'expired';
  src: string;
};
type DemoService = { id: string; name: string };

/** The demo's "send a reminder after" setting (60 minutes): a sent reminder went out this long after the checkout was left. */
const REMINDER_DELAY_MS = 60 * 60_000;

/** A checkout as the mock keeps it: the DTO plus the full address (the DTO carries it masked). */
export type MockCheckout = AbandonedCheckout & { rawEmail: string };

/** What the three routes read and change. `imeiChecks` are the moments of the demo's IMEI checks, for the funnel. */
export type CheckoutsState = { checkouts: Collection<MockCheckout>; imeiChecks: number[] };

/** Stable per checkout: the same people agree on every run, so the screens look the same. */
export function agreedToMarketing(id: number): boolean {
  return (id * 7) % 10 < 7;
}

function toMock(row: DemoCheckout, services: Map<string, string>): MockCheckout {
  const id = demoNumericId(row.id);
  const marketingConsent = agreedToMarketing(id);
  const emailed = row.recovery === 'sent' || row.recovery === 'converted';
  return {
    id,
    rawEmail: row.email,
    email: maskEmail(row.email),
    serviceName: services.get(row.sid) ?? 'Unknown service',
    // The demo keeps the basket in the customer's own currency; the mock sends it as it is with a rate of 1.
    grossAmount: toMoney(row.gross),
    fxRate: '1.0000',
    currencyCode: row.cur,
    status: row.recovery === 'converted' ? 'paid' : row.status,
    utm: { source: row.src },
    createdAt: toIso(row.created),
    recoveryEmailedAt: emailed ? toIso(row.created + REMINDER_DELAY_MS) : null,
    orderId: row.recovery === 'converted' ? 90_000 + id : null,
    marketingConsent,
    // The demo's "pending" is a checkout left less than an hour ago: its automatic reminder has not gone out yet.
    canRecover: marketingConsent && row.recovery === 'none',
  };
}

async function build(): Promise<CheckoutsState> {
  const state = await loadDemoState();
  const services = new Map(
    demoRows<DemoService>(state, 'services').map((service) => [service.id, service.name]),
  );
  return {
    checkouts: new Collection(demoRows<DemoCheckout>(state, 'checkouts').map((row) => toMock(row, services))),
    imeiChecks: demoRows<{ ts: number }>(state, 'imeiChecks').map((check) => check.ts),
  };
}

// Built once and kept: the rebased timestamps stay consistent for the whole session.
let state: Promise<CheckoutsState> | undefined;

/** The mock tables. */
export function checkoutsState(): Promise<CheckoutsState> {
  state ??= build();
  return state;
}

/** Puts the tables back to the seed (tests, after each test). */
export function resetCheckoutsState(): void {
  state = undefined;
}

/** The row as the API sends it, without the mock's full address. */
export function toDto(row: MockCheckout): AbandonedCheckout {
  const { rawEmail: _rawEmail, ...dto } = row;
  return dto;
}
