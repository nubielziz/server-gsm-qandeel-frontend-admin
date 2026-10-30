// Moves a merged feature's HANDOFF.md into the shared docs, then deletes it (lead tool, run at merge time):
// mismatch rows go to docs/MISMATCHES.md with the next free M numbers, assumed contracts and backend questions go to
// docs/ASSUMED_CONTRACTS.md under the feature's heading. SHARED-NEEDS and deep links are for the lead to act on: they are
// printed, not copied. Usage: node scripts/integrate-handoff.mjs <feature>
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const name = process.argv[2];
if (!/^[a-z][a-z0-9-]*$/.test(name ?? '')) {
  console.error('Usage: node scripts/integrate-handoff.mjs <feature>');
  process.exit(2);
}
const handoffPath = path.join(root, 'src/features', name, 'HANDOFF.md');
const handoff = fs.readFileSync(handoffPath, 'utf8');

/** The body of a `## Title` section (up to the next `## `), or '' when it is missing. */
function section(title) {
  const match = new RegExp(`^## ${title}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm').exec(handoff);
  return match ? match[1].trim() : '';
}

// Renumber FEATURE-n rows to the next free Mnn, and rewrite every mention of them in the moved text.
const mismatchesPath = path.join(root, 'docs/MISMATCHES.md');
const mismatches = fs.readFileSync(mismatchesPath, 'utf8');
let next = Math.max(...[...mismatches.matchAll(/^\| M(\d+) \|/gm)].map((m) => Number(m[1]))) + 1;
const prefix = name.toUpperCase();
const rows = section('Mismatches')
  .split('\n')
  .filter((line) => new RegExp(`^\\| ${prefix}-\\d+ \\|`).test(line));
const renumber = new Map();
for (const row of rows) renumber.set(new RegExp(`^\\| (${prefix}-\\d+) \\|`).exec(row)[1], `M${next++}`);
const rewrite = (text) =>
  text.replace(new RegExp(`\\b${prefix}-(\\d+)\\b`, 'g'), (whole) => renumber.get(whole) ?? whole);

// Append the rows right after the last row of the table.
const lines = mismatches.split('\n');
const lastRow = lines.reduce((last, line, index) => (/^\| M\d+ \|/.test(line) ? index : last), -1);
lines.splice(lastRow + 1, 0, ...rows.map(rewrite));
fs.writeFileSync(mismatchesPath, lines.join('\n'));

// Contracts and questions for the backend team, one heading per feature.
const contractsPath = path.join(root, 'docs/ASSUMED_CONTRACTS.md');
const header = `# Assumed contracts

What the console assumes where the API map gives no body, field or parameter, per feature, with the questions for the
backend team. Each item is also marked "Assumed contract" in the feature's JSDoc. Moved here from each feature's
HANDOFF.md at merge time.
`;
const existing = fs.existsSync(contractsPath) ? fs.readFileSync(contractsPath, 'utf8') : header;
const contracts = rewrite(section('Assumed contracts'));
const questions = rewrite(section('Backend questions'));
const block = [
  `\n## ${name}\n`,
  contracts || '- none',
  ...(questions ? ['\n### Questions for the backend\n', questions] : []),
  '',
].join('\n');
fs.writeFileSync(contractsPath, `${existing.trimEnd()}\n${block}`);

fs.unlinkSync(handoffPath);
const mapped = [...renumber].map(([from, to]) => `${from}→${to}`).join(', ');
console.log(
  `${name}: ${rows.length} mismatch rows (${mapped || 'none'}); contracts and questions moved; HANDOFF.md deleted`,
);
for (const title of ['SHARED-NEEDS', 'Deep links']) {
  const body = section(title);
  if (body) console.log(`\n--- ${title} (for the lead) ---\n${rewrite(body)}`);
}
