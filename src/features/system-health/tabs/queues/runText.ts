// Words for one run of a scheduled job in the history drawer (route group `health`): who started it and what it left
// in its result. The result is the job's own summary, so the text is built from whatever simple fields it holds.
import type { JsonValue } from '@/lib/api';
import { plainNumber } from '../../lib';
import type { JobRun } from '../../types';

/** Why the run happened: on its schedule, by a staff member, or because of an event. */
export function triggerText(run: Pick<JobRun, 'trigger' | 'triggeredBy'>): string {
  switch (run.trigger) {
    case 'schedule':
      return 'On schedule';
    case 'manual':
      return run.triggeredBy ? `Run by ${run.triggeredBy.name}` : 'Run by hand';
    case 'event':
      return 'Started by an event';
    default:
      // The contract is assumed: a trigger we do not know is shown as the server wrote it.
      return String(run.trigger);
  }
}

/** "entriesChecked" and "failed_checks" read as "entries checked" and "failed checks". */
function wordsOf(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

const MAX_TEXT = 40;

/** A simple field as text, or null for what has no short reading (nested objects, lists, null, long text). */
function simpleText(value: JsonValue): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? plainNumber(value, 2) : null;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string') {
    const text = value.trim();
    return text !== '' && text.length <= MAX_TEXT ? text : null;
  }
  return null;
}

/**
 * The first few simple fields of a run's result as one line: `{ suppliers: 6, prices: 1480 }` is
 * "suppliers 6 · prices 1,480". Fields with no short reading are left out. Empty when there is nothing to say.
 */
export function summarizeResult(result: JobRun['result'] | undefined, limit = 6): string {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(result)) {
    const text = simpleText(value);
    if (text !== null) parts.push(`${wordsOf(key)} ${text}`);
    if (parts.length === limit) break;
  }
  return parts.join(' · ');
}
