// Generates src/lib/api/schema.gen.ts: one `XxxRow` interface per table of reference/gsm-map/data/schema.mjs
// (decision 011). Usage: npm run gen:types. Exits with code 1 when a table has no English description.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tables } from '../reference/gsm-map/data/schema.mjs';
import { tableDescriptions } from './table-descriptions.en.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = resolve(root, 'src/lib/api/schema.gen.ts');

/* ---------------------------------------------------------------------------------------------
 * Type rules. Decision 011 gives the general rules; the explicit lists below are the "short explicit
 * lists" it allows, for names a pattern cannot get right. Anything a screen needs more precise
 * (enums, joins) is narrowed in that feature's own DTO.
 * ------------------------------------------------------------------------------------------- */

// Never sent by the API.
const OMITTED = /_(hash|enc)$/;
// Every row type gets these three, so a column of the same name in the schema is not repeated.
const BASE_COLUMNS = new Set(['id', 'created_at', 'updated_at']);

const KNOWN_HINTS = new Set(['nullable', 'unique', 'jsonb', 'text[]', 'bigint[]', 'int[]', 'cidr[]']);
const ARRAY_TYPES = { 'bigint[]': 'Id[]', 'text[]': 'string[]', 'cidr[]': 'string[]', 'int[]': 'number[]' };

const BOOLEAN_PATTERN = /^(is_|has_|allow_|supports_|must_|requires_)|_enabled$/;
const BOOLEAN_NAMES = new Set([
  'required',
  'granted',
  'three_ds',
  'marketing_opt_in',
  'charm_rounding',
  'overdraft_allowed',
]);

// Dates that do not end in `_at`.
const DATE_NAMES = new Set(['valid_from', 'valid_to', 'effective_from', 'cached_until', 'locked_until']);

const NUMBER_PATTERN = /_(count|ms|qty|per_min|hours|h)$/;
const NUMBER_NAMES = new Set([
  'sort',
  'priority',
  'quantity',
  'decimals',
  'attempt',
  'attempts',
  'failed_attempts',
  'size',
  'version',
  'score',
  'csat_score',
  'release_year',
  'http_status',
  'response_code',
  'max_concurrency',
  'helpful_yes',
  'helpful_no',
]);

const DECIMAL_PATTERN = /^percent$|_percent$|_rate$|^rate_/;

const MONEY_PATTERN =
  /^(amount|price|cost|balance|credit|fixed|min_profit|low_balance_alert)$|_amount$|_price$|_cost$|^fee|^total|_limit$/;
// Money columns the pattern misses.
const MONEY_NAMES = new Set(['balance_after', 'earn_threshold']);

// JSON columns the schema does not mark `jsonb`.
const JSON_VALUE_NAMES = new Set(['before', 'after', 'payload', 'request', 'response']);

// Columns that end in `_id` but hold an external identifier (a string), not one of our numeric ids.
const STRING_ID_NAMES = new Set([
  'gateway_txn_id',
  'gateway_refund_id',
  'gateway_dispute_id',
  'remote_id',
  'telegram_chat_id',
  'customer_vat_id',
]);

// `table.column` where the general rule is wrong for that table.
const OVERRIDES = {
  'support_tickets.priority': 'string', // low | normal | high, not a sort number
  'legal_documents.version': 'string', // "3.2"
  'orders.customer_id': 'Id | null', // exactly one of client_id / customer_id is set (see the table's description)
  'invoices.customer_id': 'Id | null',
};

/** Splits a schema column such as "client_id nullable" or "file_ids bigint[]". */
export function parseColumn(spec) {
  const [name, ...hints] = spec.trim().split(/\s+/);
  for (const hint of hints) {
    if (!KNOWN_HINTS.has(hint)) throw new Error(`Unknown column hint "${hint}" in "${spec}"`);
  }
  return { name, hints };
}

/**
 * The TypeScript type of a column, or null when the column is not sent.
 * `foreignKeys` maps a column to its kind ('fk' | 'poly' | 'array') from the schema's own `fk` list: such a
 * column holds our ids even when its name does not end in `_id` (`suspended_by`, `reviewed_by`).
 */
export function columnType(table, spec, foreignKeys = new Map()) {
  const { name, hints } = parseColumn(spec);
  if (OMITTED.test(name) || BASE_COLUMNS.has(name)) return null;
  const nullable = hints.includes('nullable');
  const withNull = (type) => (nullable && !type.endsWith('| null') ? `${type} | null` : type);

  const override = OVERRIDES[`${table}.${name}`];
  if (override) return withNull(override);

  const arrayHint = hints.find((hint) => hint in ARRAY_TYPES);
  if (arrayHint) return withNull(ARRAY_TYPES[arrayHint]);
  if (hints.includes('jsonb')) return withNull('JsonObject');
  if (JSON_VALUE_NAMES.has(name)) return 'JsonValue';
  if (STRING_ID_NAMES.has(name)) return withNull('string');
  if (foreignKeys.has(name)) return withNull(foreignKeys.get(name) === 'array' ? 'Id[]' : 'Id');
  // `created_by`, `suspended_by`, `reviewed_by`…: always a staff id, even where the schema lists no foreign key.
  if (name.endsWith('_by')) return withNull('Id');
  if (name.endsWith('_ids')) return withNull('Id[]');
  if (name.endsWith('_at') || DATE_NAMES.has(name)) return 'IsoDateTime | null';
  if (name.endsWith('_id')) return withNull('Id');
  if (BOOLEAN_PATTERN.test(name) || BOOLEAN_NAMES.has(name)) return withNull('boolean');
  // Counters before rates: `rate_limit_per_min` is a count, not a rate.
  if (NUMBER_PATTERN.test(name) || NUMBER_NAMES.has(name)) return withNull('number');
  // Rates before money: `fee_percent` is a rate, `fee_fixed` is money.
  if (DECIMAL_PATTERN.test(name)) return withNull('Decimal');
  if (MONEY_PATTERN.test(name) || MONEY_NAMES.has(name)) return withNull('Money');
  return withNull('string');
}

/** snake_case to camelCase: `twofa_enabled` is `twofaEnabled`. */
export function camelCase(name) {
  return name.replace(/_([a-z0-9])/g, (_match, char) => char.toUpperCase());
}

/** `staff_users` is `StaffUserRow`, `service_categories` is `ServiceCategoryRow`. */
export function rowTypeName(table) {
  const words = table.split('_');
  const last = words.length - 1;
  const word = words[last];
  if (word.endsWith('ies')) words[last] = `${word.slice(0, -3)}y`;
  else if (word.endsWith('s') && !word.endsWith('ss')) words[last] = word.slice(0, -1);
  return `${words.map((w) => w[0].toUpperCase() + w.slice(1)).join('')}Row`;
}

const TYPE_NAMES = ['Decimal', 'Id', 'IsoDateTime', 'JsonObject', 'JsonValue', 'Money'];

/** Wraps text into JSDoc lines of at most `width` characters. */
function jsdoc(text, width = 100) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && `${line} ${word}`.length > width - 3) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  lines.push(line);
  return lines.length === 1 ? [`/** ${line} */`] : ['/**', ...lines.map((l) => ` * ${l}`), ' */'];
}

/** The full file text for the given tables and descriptions. */
export function render(schemaTables, descriptions) {
  const body = [];
  const used = new Set();
  for (const table of schemaTables) {
    const foreignKeys = new Map((table.fk ?? []).map(([column, , kind]) => [column, kind ?? 'fk']));
    const properties = ['  id: Id;'];
    for (const spec of table.cols) {
      const type = columnType(table.n, spec, foreignKeys);
      if (type === null) continue;
      properties.push(`  ${camelCase(parseColumn(spec).name)}: ${type};`);
    }
    properties.push('  createdAt: IsoDateTime;', '  updatedAt?: IsoDateTime;');
    const propertyText = properties.join('\n');
    for (const name of TYPE_NAMES) if (new RegExp(`\\b${name}\\b`).test(propertyText)) used.add(name);
    body.push(
      [
        ...jsdoc(`${descriptions[table.n]} Table \`${table.n}\`.`),
        `export interface ${rowTypeName(table.n)} {`,
        propertyText,
        '}',
      ].join('\n'),
    );
  }
  const imports = TYPE_NAMES.filter((name) => used.has(name)).join(', ');
  return [
    '// Generated by scripts/gen-entity-types.mjs from reference/gsm-map/data/schema.mjs: generated, do not edit.',
    '// Run `npm run gen:types` to refresh it. These are starting points; each feature narrows them in its own DTOs.',
    `import type { ${imports} } from './types';`,
    '',
    body.join('\n\n'),
    '',
  ].join('\n');
}

/** Tables with no English description, or a description that still contains Arabic. */
export function descriptionProblems(schemaTables, descriptions) {
  const problems = [];
  for (const table of schemaTables) {
    const text = descriptions[table.n];
    if (!text || !text.trim()) problems.push(`${table.n}: no English description`);
    else if (/[؀-ۿ]/.test(text)) problems.push(`${table.n}: description contains Arabic`);
  }
  return problems;
}

function main() {
  const problems = descriptionProblems(tables, tableDescriptions);
  if (problems.length > 0) {
    console.error(`Add or fix these in scripts/table-descriptions.en.mjs:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  const known = new Set(tables.map((t) => t.n));
  for (const name of Object.keys(tableDescriptions)) {
    if (!known.has(name)) console.warn(`Warning: description for unknown table "${name}" is ignored.`);
  }
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, render(tables, tableDescriptions));
  console.log(`Wrote ${OUT_FILE} (${tables.length} row types)`);
}

// Run only when started from the command line, so tests can import the rules.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
