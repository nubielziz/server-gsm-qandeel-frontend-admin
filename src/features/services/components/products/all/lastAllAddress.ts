// The last address of the All view of each kind, kept for the session (not across sessions, and never sent anywhere), so that "Back to All"
// from an editor returns to the same list: the same filters, page and page size, not the first page of everything. The All view writes it
// whenever its address changes; an editor (or any link back) reads it with `lastAllLink`. Storage can be missing or blocked (private
// mode, a quota): then nothing is remembered and the link goes to the plain list of the kind.
import type { ServiceType } from '@/lib/serviceTypes';
import { allLink, parseAllAddress, type AllAddress } from './allAddress';

const STORAGE_KEY = 'gsm-products-all-address';

/** What is kept: for each kind, the query of the list's address as `allLink` wrote it (no path). */
type Remembered = Partial<Record<ServiceType, string>>;

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

/** Keeps the address the All view of a kind has now. Called by the view; a storage that refuses is ignored. */
export function rememberAllAddress(type: ServiceType, address: AllAddress): void {
  try {
    const query = allLink(type, address).split('?')[1] ?? '';
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [type]: query }));
  } catch {
    // Nothing to do: the next "Back to All" goes to the plain list.
  }
}

/**
 * The address to go back to: the list of a kind as it was last seen in this session, or the plain list of the kind when none was seen.
 * What was kept is read again through the address parser, so a value that was damaged or written by an older version cannot make a bad
 * link. The editor calls this for its "Back to All" link.
 */
export function lastAllLink(type: ServiceType): string {
  const kept = readAll()[type];
  if (typeof kept !== 'string') return allLink(type);
  return allLink(type, parseAllAddress(new URLSearchParams(kept)));
}
