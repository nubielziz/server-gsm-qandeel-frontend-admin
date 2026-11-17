// English only (decision 039): takes the language out of the demo's captured state. The demo (reference/gsm-admin, read-only) still
// lists "EN, AR" languages, a customer language and an Arabic legal row; the console's mock layer must not. `extract-demo-seed.mjs`
// applies `dropLanguages` before it writes, so a later extract cannot bring the values back. Run this file itself to normalise the
// committed `src/mocks/seed/demo-state.json` in place: `node scripts/english-only-seed.mjs`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stateFile = resolve(root, 'src/mocks/seed/demo-state.json');

/**
 * Removes the language from the demo state, in place: `customers[].locale`, `listings[]`, `landing[]` and `pages[].langs`,
 * `legal[].lang`, and every legal row that is not the English text (the Arabic Terms of service 3.2, `lg2`). Returns the state.
 * @param {Record<string, unknown>} state the demo's `S` object, or `state` of the captured file
 */
export function dropLanguages(state) {
  const rows = (key) => (Array.isArray(state[key]) ? state[key] : []);
  for (const row of rows('customers')) delete row.locale;
  for (const key of ['listings', 'landing', 'pages']) for (const row of rows(key)) delete row.langs;
  if (Array.isArray(state.legal)) {
    state.legal = state.legal.filter((row) => String(row.lang ?? 'EN').toUpperCase() === 'EN');
    for (const row of state.legal) delete row.lang;
  }
  return state;
}

/**
 * The text of the captured file: one line per top-level key, so a data change shows up as a readable diff.
 * @param {number} capturedAt the clock the demo was seeded with
 * @param {Record<string, unknown>} state the demo state
 * @param {(key: string, value: unknown) => unknown} [replacer] JSON replacer (the extract turns Sets and Maps into tagged arrays)
 */
export function formatDemoState(capturedAt, state, replacer) {
  const body = Object.entries(state)
    .map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value, replacer)}`)
    .join(',\n');
  return `{"capturedAt":${capturedAt},"state":{\n${body}\n}}\n`;
}

// Run directly: normalise the committed file.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const captured = JSON.parse(readFileSync(stateFile, 'utf8'));
  writeFileSync(stateFile, formatDemoState(captured.capturedAt, dropLanguages(captured.state)));
  console.log(`Wrote ${stateFile}`);
}
