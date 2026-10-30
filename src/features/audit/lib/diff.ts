// Turns the `before` and `after` of an audit entry into the lines of the Field / Before / After table, and writes values
// as plain text. Ports the `diff` array of the demo's logAudit (11-state.js): the server sends two snapshots instead, and
// the console works out what changed. Values are only ever text, never HTML.
import type { JsonValue } from '@/lib/api';

/** One changed field. `from` or `to` is undefined when the field was not there before or is gone after. */
export type DiffLine = { field: string; from: JsonValue | undefined; to: JsonValue | undefined };

function isObject(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The fields of a snapshot. Something that is not an object (a bare string or list) is one field called "value".
function fieldsOf(snapshot: JsonValue | undefined): Map<string, JsonValue> {
  if (snapshot === undefined || snapshot === null) return new Map();
  return new Map(isObject(snapshot) ? Object.entries(snapshot) : [['value', snapshot]]);
}

// Missing and null count as the same, so a field that was never set and one saved as null do not show as a change.
const same = (a: JsonValue | undefined, b: JsonValue | undefined) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * The fields that differ between the two snapshots, in the order they first appear (before's fields, then the new ones).
 * An entry that only logs an action (a sign-in) has no snapshots and no lines.
 */
export function diffOf(before: JsonValue | undefined, after: JsonValue | undefined): DiffLine[] {
  const from = fieldsOf(before);
  const to = fieldsOf(after);
  const fields = [...new Set([...from.keys(), ...to.keys()])];
  return fields
    .filter((field) => !same(from.get(field), to.get(field)))
    .map((field) => ({ field, from: from.get(field), to: to.get(field) }));
}

/** True when the value is a list or an object, which the table shows as formatted JSON instead of a line of text. */
export function isStructured(value: JsonValue | undefined): boolean {
  return typeof value === 'object' && value !== null;
}

/** A value as one line of text; nothing (missing, null, empty) is an empty string. Lists and objects are compact JSON. */
export function valueText(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  return isStructured(value) ? JSON.stringify(value) : String(value);
}

/** A list or an object as indented JSON, for the scrollable block of the table. */
export function valueJson(value: JsonValue): string {
  return JSON.stringify(value, null, 2);
}
