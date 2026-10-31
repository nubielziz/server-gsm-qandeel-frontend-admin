// Flattens the admin API design into docs/route-manifest.json and docs/route-manifest.md.
// Reads reference/gsm-map/data/routes.mjs and schema.mjs, plus the English text in scripts/route-descriptions.en.mjs.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { groups, routes } from '../reference/gsm-map/data/routes.mjs';
import { tables as schemaTables } from '../reference/gsm-map/data/schema.mjs';
import { descriptions, groupNames } from './route-descriptions.en.mjs';

const SOURCE = 'reference/gsm-map/data/routes.mjs';
const OUT_DIR = join(import.meta.dirname, '..', 'docs');

// Fixed by the API design: a change in the map must be reviewed here before the manifest is rebuilt.
const EXPECTED_ROWS = {
  auth: 22,
  clients: 11,
  catalog: 11,
  orders: 16,
  suppliers: 11,
  billing: 7,
  growth: 9,
  ops: 7,
  customers: 10,
  refunds: 12,
  storefront: 8,
  support: 4,
  risk: 7,
  promo: 3,
  health: 22,
};
const EXPECTED_ADMIN_ENDPOINTS = 268;

// Every system route must be listed in one of these, so a new one gets a decision instead of a silent default.
// Each excluded route keeps its own reason, which is printed in the markdown view.
const SYSTEM_KEEP = ['GET /health'];
const SYSTEM_EXCLUDE = {
  'GET /openapi.json': 'REST v1 docs, not used by the admin console',
  'GET /docs': 'REST v1 docs, not used by the admin console',
  'GET /metrics':
    'Prometheus scrape target for the internal network or a token; the API reads it for the health routes, the console never calls it',
};

const RULES = {
  pagination:
    'Refine simple-rest: _start, _end, _sort, _order, field filters; total count in the x-total-count header',
  errors: 'application/problem+json {type,title,status,code,detail,errors[]}',
  crud: 'L=GET /resource (list), S=GET /resource/:id (show), C=POST /resource (create), U=PATCH /resource/:id (update), D=DELETE /resource/:id (delete); every other row is one endpoint with op "action"',
};

// Expansion order of a CRUD row; byId means the endpoint targets /resource/:id.
const CRUD_OPS = [
  { letter: 'L', method: 'GET', op: 'list', byId: false },
  { letter: 'S', method: 'GET', op: 'show', byId: true },
  { letter: 'C', method: 'POST', op: 'create', byId: false },
  { letter: 'U', method: 'PATCH', op: 'update', byId: true },
  { letter: 'D', method: 'DELETE', op: 'delete', byId: true },
];
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// Raw auth values in the map: public, and any signed-in staff session. Anything else is a permission.
const AUTH_PUBLIC = 'عام';
const AUTH_SESSION = 'جلسة';
const ARABIC = /\p{Script=Arabic}/u;

/** The key a map row has in the English file: "METHOD /path", with "CRUD" as the method of CRUD rows. */
const rowKey = (row) => `${row.m} ${row.p}`;

/**
 * Picks the map rows the console needs: every admin row plus the system routes it uses.
 * Why: an unclassified system route stops the build, so none is added or dropped by accident.
 */
function selectRows() {
  const rows = [];
  const excluded = [];
  for (const row of routes) {
    const key = rowKey(row);
    if (row.s === 'admin') rows.push(row);
    else if (row.s === 'system' && SYSTEM_KEEP.includes(key)) rows.push(row);
    else if (row.s === 'system' && Object.hasOwn(SYSTEM_EXCLUDE, key))
      excluded.push({ key, reason: SYSTEM_EXCLUDE[key] });
    else if (row.s === 'system')
      throw new Error(`system route "${key}" is not classified: add it to SYSTEM_KEEP or SYSTEM_EXCLUDE`);
  }
  return { rows, excluded };
}

/**
 * Splits the raw auth value of a row into an access level and a permission string.
 * Why: the console needs to tell public, session-only and permission-guarded routes apart.
 * It throws on an unknown shape so a new auth style is noticed instead of guessed.
 */
function normaliseAuth(raw) {
  if (raw === AUTH_PUBLIC) return { access: 'public', permission: null };
  if (raw === AUTH_SESSION) return { access: 'session', permission: null };
  if (/^[a-z_]+:(\*|[a-z_]+)$/.test(raw)) return { access: 'permission', permission: raw };
  throw new Error(`unknown auth value "${raw}"`);
}

/**
 * Turns one map row into manifest endpoints: a CRUD row gives one endpoint per ops letter,
 * always in L,S,C,U,D order; any other row gives one endpoint with op "action".
 * Why: the console must implement endpoints, but the map stores CRUD resources as single rows.
 */
function expand(row) {
  const { access, permission } = normaliseAuth(row.a);
  const crud = row.m === 'CRUD';
  const make = (method, path, op) => ({
    key: `${method} ${path}`,
    method,
    path,
    group: row.g,
    op,
    description: descriptions[rowKey(row)],
    descriptionAr: row.f,
    access,
    permission,
    authRaw: row.a,
    stage: row.st,
    tables: [...row.t],
    origin: { method: row.m, ops: crud ? row.ops : null, path: row.p },
  });

  if (!crud) {
    if (!HTTP_METHODS.includes(row.m)) throw new Error(`${row.p}: unsupported method "${row.m}"`);
    return [make(row.m, row.p, 'action')];
  }
  const unknown = [...row.ops].filter((letter) => !CRUD_OPS.some((o) => o.letter === letter));
  if (unknown.length) throw new Error(`${row.p}: unknown CRUD ops "${unknown.join('')}"`);
  return CRUD_OPS.filter((o) => row.ops.includes(o.letter)).map((o) =>
    make(o.method, o.byId ? `${row.p}/:id` : row.p, o.op),
  );
}

/**
 * Expands the selected rows and gathers endpoints, groups and counts into the manifest object.
 * System routes are counted under "system", so the per-group counts add up to the totals.
 */
function buildManifest(rows, excluded) {
  const adminGroups = groups.admin;
  const ids = [...adminGroups.map((g) => g.id), 'system'];
  const byGroup = Object.fromEntries(ids.map((id) => [id, { rows: 0, endpoints: 0 }]));
  const endpoints = [];
  for (const row of rows) {
    const list = expand(row);
    const entry = byGroup[row.s === 'system' ? 'system' : row.g];
    if (!entry) throw new Error(`${rowKey(row)}: unknown group "${row.g}"`);
    entry.rows += 1;
    entry.endpoints += list.length;
    endpoints.push(...list);
  }
  return {
    source: SOURCE,
    rules: RULES,
    counts: { rows: rows.length, endpoints: endpoints.length, byGroup },
    groups: adminGroups.map(({ id, name }) => ({ id, name: groupNames[id], nameAr: name })),
    excluded,
    endpoints,
  };
}

/**
 * Checks the English layer against the selected rows and groups.
 * Why: every row needs a clean English sentence, and a leftover entry would mean a renamed or removed route.
 */
function findEnglishProblems(rows) {
  const problems = [];
  const rowKeys = new Set(rows.map(rowKey));
  for (const key of rowKeys) {
    const text = descriptions[key];
    if (typeof text !== 'string' || !text.trim()) problems.push(`no English description for ${key}`);
    else if (ARABIC.test(text)) problems.push(`English description contains Arabic letters: ${key}`);
  }
  for (const key of Object.keys(descriptions)) {
    if (!rowKeys.has(key)) problems.push(`description key matches no row: ${key}`);
  }

  const groupIds = new Set(groups.admin.map((g) => g.id));
  for (const id of groupIds) {
    const name = groupNames[id];
    if (typeof name !== 'string' || !name.trim()) problems.push(`no English name for group ${id}`);
    else if (ARABIC.test(name)) problems.push(`English group name contains Arabic letters: ${id}`);
  }
  for (const id of Object.keys(groupNames)) {
    if (!groupIds.has(id)) problems.push(`group name matches no admin group: ${id}`);
  }
  return problems;
}

/**
 * Runs all sanity checks and returns every problem found, so one run shows all failures at once.
 * Covers unique keys, known tables, the design's row and endpoint counts, GET /health and the English layer.
 */
function findProblems({ counts, endpoints }, rows) {
  const problems = [];

  const seen = new Set();
  for (const { key } of endpoints) {
    if (seen.has(key)) problems.push(`duplicate endpoint key: ${key}`);
    seen.add(key);
  }

  const knownTables = new Set(schemaTables.map((t) => t.n));
  for (const row of rows) {
    for (const t of row.t) if (!knownTables.has(t)) problems.push(`unknown table "${t}" in ${rowKey(row)}`);
  }

  const groupIds = new Set([...Object.keys(EXPECTED_ROWS), ...Object.keys(counts.byGroup)]);
  groupIds.delete('system');
  for (const id of groupIds) {
    const actual = counts.byGroup[id]?.rows ?? 0;
    const expected = EXPECTED_ROWS[id] ?? 0;
    if (actual !== expected) problems.push(`group ${id}: ${actual} rows, expected ${expected}`);
  }

  const adminEndpoints = counts.endpoints - counts.byGroup.system.endpoints;
  if (adminEndpoints !== EXPECTED_ADMIN_ENDPOINTS) {
    problems.push(`admin endpoints: ${adminEndpoints}, expected ${EXPECTED_ADMIN_ENDPOINTS}`);
  }

  const systemKeys = endpoints.filter((e) => e.group === null).map((e) => e.key);
  if (systemKeys.join() !== SYSTEM_KEEP.join()) {
    problems.push(`system endpoints: [${systemKeys.join(', ')}], expected [${SYSTEM_KEEP.join(', ')}]`);
  }

  return [...problems, ...findEnglishProblems(rows)];
}

/** Prints rows and endpoints per group. Runs before the checks so the numbers show on failure too. */
function printSummary({ rows, endpoints, byGroup }) {
  const { system, ...admin } = byGroup;
  const line = (name, r, e) => `${name.padEnd(12)}${String(r).padStart(6)}${String(e).padStart(11)}`;
  console.log(
    [
      line('group', 'rows', 'endpoints'),
      ...Object.entries(admin).map(([id, c]) => line(id, c.rows, c.endpoints)),
      line('admin total', rows - system.rows, endpoints - system.endpoints),
      line('system', system.rows, system.endpoints),
      line('all', rows, endpoints),
    ].join('\n'),
  );
}

/**
 * Renders the English-only markdown view: totals and rules first, one table per admin group, then system.
 * Why: a table with one endpoint per line is easy to grep and read, next to the JSON used by tools.
 */
function toMarkdown({ rules, counts, groups: adminGroups, excluded, endpoints }) {
  const { system } = counts.byGroup;
  const cell = (text) => text.replaceAll('|', '\\|'); // a bare pipe would end the table cell
  const access = (e) => (e.permission ? `\`${e.permission}\`` : e.access);
  const table = (list) => [
    '| Method | Path | Op | Permission | Description |',
    '| --- | --- | --- | --- | --- |',
    ...list.map(
      (e) => `| \`${e.method}\` | \`${e.path}\` | ${e.op} | ${access(e)} | ${cell(e.description)} |`,
    ),
    '',
  ];

  const lines = [
    '# Admin API route manifest',
    '',
    'Generated by `scripts/build-route-manifest.mjs` (`npm run routes:manifest`) from the API design in `reference/gsm-map`. Do not edit by hand. Machine-readable twin: `docs/route-manifest.json`.',
    '',
    `- Route rows: ${counts.rows} (${counts.rows - system.rows} admin, ${system.rows} system)`,
    `- Endpoints: ${counts.endpoints} (${counts.endpoints - system.endpoints} admin, ${system.endpoints} system)`,
    `- Admin groups: ${adminGroups.length}`,
    `- Pagination: ${rules.pagination}`,
    `- Errors: ${rules.errors}`,
    `- CRUD rows: ${rules.crud}`,
    '',
  ];
  for (const g of adminGroups) {
    const c = counts.byGroup[g.id];
    lines.push(`## ${g.id} - ${g.name}`, '', `${c.rows} rows, ${c.endpoints} endpoints.`, '');
    lines.push(...table(endpoints.filter((e) => e.group === g.id)));
  }
  lines.push('## System', '', ...table(endpoints.filter((e) => e.group === null)));
  if (excluded.length) {
    lines.push('Excluded from the manifest:', '', ...excluded.map((e) => `- \`${e.key}\`: ${e.reason}`), '');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

/**
 * Builds the manifest, prints the counts, runs the checks, and writes both files only when every check passes.
 * Why: a manifest that failed a check must never replace a good one on disk.
 */
function main() {
  const { rows, excluded } = selectRows();
  const manifest = buildManifest(rows, excluded);
  printSummary(manifest.counts);
  console.log(
    `English layer: ${Object.keys(descriptions).length} descriptions, ${Object.keys(groupNames).length} group names`,
  );

  const problems = findProblems(manifest, rows);
  if (problems.length) {
    console.error(`\nroute manifest NOT written, ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
    process.exitCode = 1;
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'route-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(OUT_DIR, 'route-manifest.md'), toMarkdown(manifest));
  console.log('\nAll checks passed. Wrote docs/route-manifest.json and docs/route-manifest.md');
}

try {
  main();
} catch (error) {
  console.error(`route manifest failed: ${error.message}`);
  process.exitCode = 1;
}
