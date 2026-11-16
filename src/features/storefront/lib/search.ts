// Small pure helpers of the Search tab: how a typed term is cleaned the way the server cleans it, the checks the forms make
// before a request (the server still decides), the window of a pinned rule, the personal-data guard of the report, and byte
// and date text. Nothing here talks to the API.
import { fmtDate } from '@/lib/format';
import type { BadgeTone, IconName } from '@/components/ui';
import type { EngineStatus, SearchSynonym, SynonymKind } from '../types';

/** The limits of the backend plan (§4.6): a rule holds 2 to 20 terms of at most 60 characters. */
export const MIN_TERMS = 2;
export const MAX_TERMS = 20;
export const MAX_TERM_LENGTH = 60;
/** A pin holds at most 10 pinned services (positions 1 to 10) and 50 hidden ones; its query has 1 to 100 characters. */
export const MAX_PINNED = 10;
export const MAX_HIDDEN = 50;
export const MAX_QUERY_LENGTH = 100;

/**
 * A term as the server stores it (backend `normaliseText`, minus HTML entities): compatibility form, lower case, control
 * characters and emoji removed, `&` removed (`at&t` becomes `att`), brackets and `| , ; :` turned into spaces, spaces collapsed.
 * The forms show this text before the request, so a duplicate such as "FRP" and "frp " is seen at once.
 */
export function normaliseTerm(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/&/g, '')
    .replace(/[()[\]{}<>|,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** What a typed or pasted text adds to a list of terms: split at commas, semicolons, bars and new lines, cleaned, new ones only. */
export function addTerms(current: readonly string[], text: string): string[] {
  const seen = new Set(current);
  const next = [...current];
  for (const piece of text.split(/[\n,;|]/)) {
    const term = normaliseTerm(piece);
    if (term && !seen.has(term)) {
      seen.add(term);
      next.push(term);
    }
  }
  return next;
}

/** What a synonym rule says in one line: `frp = google account lock = frp lock`, or `kg → knox guard` for a one-way rule. */
export function synonymText(rule: Pick<SearchSynonym, 'kind' | 'root' | 'terms'>): string {
  return rule.kind === 'one_way' && rule.root
    ? `${rule.root} → ${rule.terms.join(', ')}`
    : rule.terms.join(' = ');
}

/** The messages a synonym form shows under its fields; a field with no problem is left out. */
export type SynonymProblems = { root?: string; terms?: string };

/**
 * The checks of the synonym form, as the backend plan states its limits: two to 20 terms of at most 60 characters whatever the kind,
 * and a root for a one-way rule. The server decides; this only saves a round trip.
 */
export function synonymProblems(kind: SynonymKind, root: string, terms: readonly string[]): SynonymProblems {
  const problems: SynonymProblems = {};
  if (terms.length < MIN_TERMS) {
    problems.terms =
      kind === 'multi'
        ? 'Add at least two words or phrases that mean the same.'
        : 'Add at least two words or phrases the root should also find.';
  } else if (terms.length > MAX_TERMS) {
    problems.terms = `A rule holds at most ${MAX_TERMS} terms.`;
  } else if (terms.some((term) => term.length > MAX_TERM_LENGTH)) {
    problems.terms = `Each term has at most ${MAX_TERM_LENGTH} characters.`;
  }
  if (kind === 'one_way') {
    const cleaned = normaliseTerm(root);
    if (!cleaned) problems.root = 'Enter the word that should find the others.';
    else if (cleaned.length > MAX_TERM_LENGTH)
      problems.root = `The root has at most ${MAX_TERM_LENGTH} characters.`;
    else if (terms.includes(cleaned)) problems.root = 'The root cannot also be one of the terms.';
  }
  return problems;
}

/** A term of the report that looks like personal data: an email, a link, a phone number, an IMEI or an order number. */
export function looksPersonal(term: string): boolean {
  const text = term.trim();
  if (text.includes('@') || /http|www\./i.test(text) || text.startsWith('+')) return true;
  return (text.match(/\d/g) ?? []).length > 5 || /\d{5,}/.test(text);
}

/** Whether a rule is switched on and inside its dates, from the staff member's clock (the server applies its own). */
export type RuleState = 'off' | 'scheduled' | 'ended' | 'live';

/** The state of a rule with an optional window. */
export function ruleState(
  rule: { isEnabled: boolean; startsAt: string | null; endsAt: string | null },
  now: number = Date.now(),
): RuleState {
  if (!rule.isEnabled) return 'off';
  if (rule.startsAt && Date.parse(rule.startsAt) > now) return 'scheduled';
  if (rule.endsAt && Date.parse(rule.endsAt) <= now) return 'ended';
  return 'live';
}

const pad = (value: number) => String(value).padStart(2, '0');

/** An ISO time as the value of a `datetime-local` box (the staff member's own time zone); empty for none. */
export function toInputValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The value of a `datetime-local` box as an ISO time; null for an empty or unreadable value. */
export function fromInputValue(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Bytes in steps of 1024 ("48 MB", "1.2 GB"); "No data" for a missing figure. */
export function bytesText(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return 'No data';
  let value = Math.abs(bytes);
  let step = 0;
  while (step < BYTE_UNITS.length - 1 && Math.round(value) >= 1024) {
    value /= 1024;
    step += 1;
  }
  const text = step > 0 && value < 10 ? value.toFixed(1).replace(/\.0$/, '') : String(Math.round(value));
  return `${text} ${BYTE_UNITS[step]}`;
}

/** The first free position (1 to 10) of a pin, or null when all ten are taken. */
export function nextPosition(taken: readonly number[]): number | null {
  for (let position = 1; position <= MAX_PINNED; position += 1) {
    if (!taken.includes(position)) return position;
  }
  return null;
}

/** The message of one row of an array field (`pinned.0.serviceId`, `pinned.0`), from react-hook-form's error tree. */
export function rowMessage(group: unknown, index: number): string | undefined {
  const row = (group as Record<number, unknown> | undefined)?.[index] as
    { message?: string; serviceId?: { message?: string }; position?: { message?: string } } | undefined;
  return row?.serviceId?.message || row?.position?.message || row?.message;
}

/** The dates of a rule in words: "Always", "From 01 Dec, 09:00", "Until 31 Dec, 18:00" or both. */
export function windowText(rule: { startsAt: string | null; endsAt: string | null }): string {
  if (rule.startsAt && rule.endsAt) return `${fmtDate(rule.startsAt)} to ${fmtDate(rule.endsAt)}`;
  if (rule.startsAt) return `From ${fmtDate(rule.startsAt)}`;
  if (rule.endsAt) return `Until ${fmtDate(rule.endsAt)}`;
  return 'Always';
}

/** How each engine state reads: the word, its tone and its icon (a state is never colour alone). */
export const ENGINE_BADGE: Record<EngineStatus, { tone: BadgeTone; icon: IconName; word: string }> = {
  ok: { tone: 'good', icon: 'checkCircle', word: 'Running' },
  down: { tone: 'crit', icon: 'xCircle', word: 'Not answering' },
  not_ready: { tone: 'warn', icon: 'loader', word: 'Not ready' },
  disabled: { tone: 'neutral', icon: 'pause', word: 'Switched off' },
};

/** The line under the document count: in sync, or how many services the index lacks or holds too many of. */
export function documentsNote(documents: number, expected: number): string {
  const gap = expected - documents;
  if (gap === 0) return 'in sync with the catalogue';
  return gap > 0 ? `${gap} missing from the index` : `${-gap} more than the catalogue`;
}

/** What the shop does while the engine is not running (backend plan §5.5: the database search answers); nothing for a healthy one. */
export function engineNote(status: EngineStatus, version: string | null): string | undefined {
  if (status === 'ok') return version ? `Typesense ${version}` : undefined;
  return status === 'not_ready'
    ? 'no index yet; the shop uses the database search'
    : 'the shop uses the database search meanwhile';
}

/**
 * A plain sentence for a last error the staff can act on: the engine refuses writes when its disk is nearly full (answer 422
 * "Rejecting write: running out of resource…"). Other errors show as the server wrote them, with no extra sentence.
 */
export function lastErrorHint(lastError: string | null): string | undefined {
  return lastError && /running out of resource/i.test(lastError)
    ? 'The search server is refusing writes because its disk is nearly full. Free some space; the next check against the database repairs the index.'
    : undefined;
}
