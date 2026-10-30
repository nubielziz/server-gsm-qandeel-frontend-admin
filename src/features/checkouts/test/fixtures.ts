// Test fixtures for the checkouts feature: one valid abandoned checkout and funnel report, changed per test. Times are relative to
// now, so "2h ago" reads the same on every run.
import type { AbandonedCheckout, FunnelReport } from '../types';

const HOUR = 3_600_000;

/** An ISO time `hours` hours ago. */
export const hoursAgo = (hours: number): string => new Date(Date.now() - hours * HOUR).toISOString();

/** A checkout left two hours ago by a customer who agreed to marketing email and has not been reminded, changed by `overrides`. */
export function checkout(overrides: Partial<AbandonedCheckout> = {}): AbandonedCheckout {
  return {
    id: 3001,
    email: 'sa•••@mail.example',
    serviceName: 'iCloud Clean / Lost Check',
    currencyCode: 'GBP',
    grossAmount: '11.9900',
    fxRate: '1.0000',
    status: 'expired',
    utm: { source: 'Google' },
    createdAt: hoursAgo(2),
    recoveryEmailedAt: null,
    orderId: null,
    marketingConsent: true,
    canRecover: true,
    ...overrides,
  };
}

/** A funnel of the last 30 days where each step is smaller than the one before. */
export function funnel(overrides: Partial<FunnelReport> = {}): FunnelReport {
  return { days: 30, imeiChecks: 900, paymentStarted: 300, paid: 120, delivered: 108, ...overrides };
}
