// Retired demo data (decision 020 and the later retirements): takes what the console no longer shows out of the demo's captured
// state. The demo (reference/gsm-admin, read-only) still gives each merchant a "Verified" or "In review" word for the documents check
// that was retired, a status "pending" to the merchants that waited for approval, commission plans, accruals, agents and referrals,
// each ticket a customer rating for the survey that was retired, and the reminder e-mail of an abandoned checkout with its policy
// and the recovery word of each checkout; the console's mock layer must carry none of them. `extract-demo-seed.mjs` applies
// `dropMerchantVerification`, `dropMerchantApproval`, `dropCommissions`, `dropTicketRatings` and `dropCheckoutReminders` before
// it writes, so a later extract cannot bring them back. Run this file itself to normalise the committed
// `src/mocks/seed/demo-state.json` in place: `node scripts/retired-seed.mjs`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDemoState } from './english-only-seed.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stateFile = resolve(root, 'src/mocks/seed/demo-state.json');

/**
 * Removes the verification word of every merchant of the demo state, in place. Returns the state.
 * @param {Record<string, unknown>} state the demo's `S` object, or `state` of the captured file
 */
export function dropMerchantVerification(state) {
  if (Array.isArray(state.merchants)) for (const row of state.merchants) delete row.kyc;
  return state;
}

/** The one merchant of the demo that stays `pending`: a legacy row, so the Activate action has an account to act on. */
export const LEGACY_PENDING_MERCHANT = 'm20';

/**
 * Makes every merchant of the demo state that waits for approval active, except the one legacy row (`LEGACY_PENDING_MERCHANT`).
 * Accounts made by staff are active at once; the demo still gives its two newest merchants the status `pending`. Returns the state.
 * @param {Record<string, unknown>} state the demo's `S` object, or `state` of the captured file
 */
export function dropMerchantApproval(state) {
  if (Array.isArray(state.merchants)) {
    for (const row of state.merchants) {
      if (row.status === 'pending' && row.id !== LEGACY_PENDING_MERCHANT) row.status = 'active';
    }
  }
  return state;
}

/**
 * Removes the commissions of the demo state, in place: the `plans` and `accruals` tables, the accrual counter `seq.ca`, and the
 * plan, agent flag and referrer of every merchant. Journal rows and audit rows that mention a commission stay: they are history, and
 * the ledger and the audit log keep showing old rows by their stored words. Returns the state.
 * @param {Record<string, unknown>} state the demo's `S` object, or `state` of the captured file
 */
export function dropCommissions(state) {
  delete state.plans;
  delete state.accruals;
  if (state.seq && typeof state.seq === 'object') delete state.seq.ca;
  if (Array.isArray(state.merchants)) {
    for (const row of state.merchants) {
      delete row.plan;
      delete row.isAgent;
      delete row.referredBy;
    }
  }
  return state;
}

/**
 * Removes the customer rating of every ticket of the demo state, in place. Returns the state.
 * @param {Record<string, unknown>} state the demo's `S` object, or `state` of the captured file
 */
export function dropTicketRatings(state) {
  if (Array.isArray(state.tickets)) for (const row of state.tickets) delete row.csat;
  return state;
}

/** The demo's e-mail that reminded a customer to finish a checkout. */
const CHECKOUT_REMINDER = 'nt5';

/**
 * Removes the reminder of an abandoned checkout from the demo state, in place: its e-mail in `settings.notifs`, its policy
 * `abandonedMinutes` and the recovery word of every checkout. The checkouts themselves stay: the dashboard's and the report's
 * funnel count them as checkouts started. Returns the state.
 * @param {Record<string, unknown>} state the demo's `S` object, or `state` of the captured file
 */
export function dropCheckoutReminders(state) {
  const settings = state.settings && typeof state.settings === 'object' ? state.settings : null;
  if (settings && Array.isArray(settings.notifs)) {
    settings.notifs = settings.notifs.filter((row) => row.id !== CHECKOUT_REMINDER);
  }
  if (settings && settings.policies) delete settings.policies.abandonedMinutes;
  if (Array.isArray(state.checkouts)) for (const row of state.checkouts) delete row.recovery;
  return state;
}

// Run directly: normalise the committed file.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const captured = JSON.parse(readFileSync(stateFile, 'utf8'));
  writeFileSync(
    stateFile,
    formatDemoState(
      captured.capturedAt,
      dropCheckoutReminders(
        dropTicketRatings(dropCommissions(dropMerchantApproval(dropMerchantVerification(captured.state)))),
      ),
    ),
  );
  console.log(`Wrote ${stateFile}`);
}
