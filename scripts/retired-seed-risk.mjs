// Retired demo data (the free IMEI check, the two risk signals that never fired and the customer risk level): takes what the
// console no longer shows out of the demo's captured state. The demo (reference/gsm-admin, read-only) still gives each customer a
// risk word, lists a rule for blocking blacklisted IMEIs, writes two signals into the held orders and has two storefront policies
// for the IMEI check. The console's mock layer must carry none of them. `extract-demo-seed.mjs` applies `dropRetiredRisk` before it
// writes, so a later extract cannot bring them back. Run this file itself to normalise the committed
// `src/mocks/seed/demo-state.json` in place: `node scripts/retired-seed-risk.mjs`.
// The demo's check log (`imeiChecks`) goes too: the funnel lost its IMEI-check step, so nothing reads it.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDemoState } from './english-only-seed.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stateFile = resolve(root, 'src/mocks/seed/demo-state.json');

/** The two signal texts of the held orders that no data source ever fed. */
const RETIRED_SIGNALS = ['IMEI was checked blacklisted before', 'VPN or proxy IP'];
/** The demo's rule that blocked blacklisted IMEIs before payment. */
const RETIRED_RULE = 'rr1';
/** The storefront policies of the IMEI check before payment and of how long its log was kept. */
const RETIRED_POLICIES = ['imeiPrecheck', 'imeiRetentionDays'];

/**
 * Removes the retired risk data from the demo state, in place: the risk word of every customer, the two signals of every order's
 * risk block, the blacklisted-IMEI rule of `risk.rules`, the two IMEI policies of `settings.policies` and the check log
 * `imeiChecks`. Returns the state.
 * @param {Record<string, unknown>} state the demo's `S` object, or `state` of the captured file
 */
export function dropRetiredRisk(state) {
  const rows = (key) => (Array.isArray(state[key]) ? state[key] : []);
  for (const row of rows('customers')) delete row.risk;
  for (const order of rows('orders')) {
    if (order.risk && Array.isArray(order.risk.signals)) {
      order.risk.signals = order.risk.signals.filter((signal) => !RETIRED_SIGNALS.includes(signal));
    }
  }
  if (state.risk && Array.isArray(state.risk.rules)) {
    state.risk.rules = state.risk.rules.filter((rule) => rule.id !== RETIRED_RULE);
  }
  if (state.settings && state.settings.policies) {
    for (const key of RETIRED_POLICIES) delete state.settings.policies[key];
  }
  delete state.imeiChecks;
  return state;
}

// Run directly: normalise the committed file.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const captured = JSON.parse(readFileSync(stateFile, 'utf8'));
  writeFileSync(stateFile, formatDemoState(captured.capturedAt, dropRetiredRisk(captured.state)));
  console.log(`Wrote ${stateFile}`);
}
