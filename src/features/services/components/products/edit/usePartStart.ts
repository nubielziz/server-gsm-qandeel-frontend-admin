// usePartStart: when the open part of the edit view may be drawn and when it must start again, so a part never works from a stale copy of
// the service. A part fills its forms once, from the record it is mounted with; this hook keeps it from mounting on a record that is being
// read again, and gives it a new start when the record changes while it holds nothing unsaved.
import { useMemo, useState } from 'react';

/** What the hook remembers about the part that is open (one scope: one part of one service). */
export type PartStart = {
  scope: string;
  /** The record, as text, the drawn part started from. Null until the part has been drawn. */
  from: string | null;
  /** Rises each time the part must start again; the part's key carries it. */
  version: number;
  /** Whether the part held unsaved changes at the last step. */
  dirty: boolean;
  /** The part went from unsaved to saved, and the record that follows is its own save (it already shows it). */
  saved: boolean;
};

/** What one step looks at. */
export type PartStartInput = {
  scope: string;
  /** The record as text; two records with the same text are the same record. */
  signature: string;
  /** False for a part that holds no copy of the record (it follows its props), which is never held back or started again. */
  fromRecord: boolean;
  /** The part holds unsaved changes. */
  dirty: boolean;
  /** The record is being read again right now. */
  refreshing: boolean;
};

/** A part that has not been drawn yet. */
export function startOf(scope: string): PartStart {
  return { scope, from: null, version: 0, dirty: false, saved: false };
}

/**
 * The next state. Pure, and it returns `previous` itself when nothing changes, so it can be applied again to its own answer.
 * - A part that has not been drawn waits while the record is being read again, then starts from the record that was read.
 * - A part with unsaved changes keeps them and the copy it started from, whatever the record does; its save compares with that copy.
 * - A part that has just been saved adopts the record that follows without starting again: it was reset to the server's answer, which
 *   is that record, and starting again would also wipe its "Saved" note. The record only changes through this editor's own saves, so a
 *   change that came while the part was unsaved is that save.
 * - Any other change of the record, read while the part is clean, starts the part again from the new record (a higher `version`).
 */
export function nextPartStart(previous: PartStart, input: PartStartInput): PartStart {
  const state = previous.scope === input.scope ? previous : startOf(input.scope);
  if (!input.fromRecord) return state;
  if (state.from === null) return input.refreshing ? state : { ...state, from: input.signature };

  const now =
    state.dirty === input.dirty
      ? state
      : { ...state, dirty: input.dirty, saved: state.saved || (state.dirty && !input.dirty) };
  if (input.dirty || input.refreshing) return now;
  if (input.signature === now.from) return now.saved ? { ...now, saved: false } : now;
  return now.saved
    ? { ...now, from: input.signature, saved: false }
    : { ...now, from: input.signature, version: now.version + 1 };
}

/**
 * `waiting` is true while the part may not be drawn yet: its record is being read again (after a save made elsewhere marked it stale), so
 * the part would start from an old copy and a later save would send it back. `version` goes in the part's key: a clean part is mounted
 * again from the fresh record when the record changes, and a part with unsaved changes keeps its key and its edits.
 * Side effects: none (state of its own only).
 */
export function usePartStart(
  scope: string,
  record: unknown,
  flags: Pick<PartStartInput, 'fromRecord' | 'dirty' | 'refreshing'>,
) {
  const signature = useMemo(() => JSON.stringify(record), [record]);
  const [state, setState] = useState(() => startOf(scope));
  const next = nextPartStart(state, { scope, signature, ...flags });
  // Derived state, set while rendering: React draws again at once with the new value (the same way useDirtyMark resets its mark).
  if (next !== state) setState(next);
  return { waiting: flags.fromRecord && next.from === null, version: next.version };
}
