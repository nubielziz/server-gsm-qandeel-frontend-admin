// The last address of the All view, kept for the session (not across sessions, and never sent anywhere), one entry per strip tab, so that
// "Back to All" from a record, and the strip's own tabs, return to the list as it was left: the same filters, page, size and sort, not
// the first page of everything. The All view writes it whenever its address changes. Storage can be missing or blocked (private mode, a
// quota): then nothing is remembered and the link goes to the plain list. What is read back goes through the address parser, so a value
// that was damaged or written by an older version cannot make a bad link.
import {
  listLink,
  parseListAddress,
  STRIP_KEYS,
  stripKeyOf,
  type ListAddress,
  type StripKey,
} from '../list/listAddress';

const STORAGE_KEY = 'gsm-accounts-list-address';

/** What is kept: for each strip tab the query of the list's address as `listLink` wrote it (no path), and the tab seen last. */
type Remembered = Partial<Record<StripKey, string>> & { last?: StripKey };

function readAll(): Remembered {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Remembered)
      : {};
  } catch {
    return {};
  }
}

/** Keeps the address the All view has now. Called by the view; a storage that refuses is ignored. */
export function rememberListAddress(address: ListAddress): void {
  try {
    const key = stripKeyOf(address.chip);
    const query = listLink(address).split('?')[1] ?? '';
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [key]: query, last: key }));
  } catch {
    // Nothing to do: the next link goes to the plain list.
  }
}

/**
 * The address to go to for a strip tab: the list as it was last seen under that tab, or the plain list of the tab when none was seen.
 * Without a tab it is the tab seen last (the record's "Back to All").
 */
export function lastListLink(key?: StripKey): string {
  const all = readAll();
  const wanted: StripKey = key ?? STRIP_KEYS.find((candidate) => candidate === all.last) ?? 'all';
  const kept = all[wanted];
  if (typeof kept !== 'string') return listLink({ chip: wanted === 'all' ? null : wanted });
  const address = parseListAddress(new URLSearchParams(kept));
  // The tab decides the population, whatever the kept query says.
  return listLink({ ...address, chip: wanted === 'all' ? null : wanted });
}
