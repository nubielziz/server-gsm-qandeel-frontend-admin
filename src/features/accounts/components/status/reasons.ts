// The reasons a person suspends an account, and how a reason and a note become the one text the server keeps (3 to 140 characters, for the
// audit log). The dialog offers exactly these reasons; "Other" needs a note of its own.

/** The reason that has no wording of its own: the note says it. */
export const OTHER_REASON = 'Other';

/** Why a person pauses an account; the dialog offers exactly these. */
export const SUSPEND_REASONS = [
  'Asked to pause the account',
  'Account may be compromised',
  'Unusual activity under review',
  'Waiting for proof of identity or payment',
  'Chargeback or payment dispute',
  OTHER_REASON,
] as const;

/** The longest note the form takes. */
export const NOTE_LIMIT = 120;

/** The longest reason the server keeps (it asks for 3 to 140 characters). */
export const REASON_LIMIT = 140;

/** A note with the spaces tidied: trimmed, and every run of spaces made one. */
export function tidyNote(note: string): string {
  return note.trim().replace(/\s+/g, ' ');
}

/**
 * The text the server keeps: the reason alone, or "<reason>: <note>" when a note was written, cut to the server's limit.
 *
 * @param reason one of `SUSPEND_REASONS`
 * @param note what the person added, possibly empty
 */
export function suspendReasonText(reason: string, note: string): string {
  const text = tidyNote(note);
  return (text === '' ? reason : `${reason}: ${text}`).slice(0, REASON_LIMIT);
}

/** The message under the note box, or true when it is fine: a note is needed for "Other" and may not pass its limit. */
export function noteProblem(reason: string, note: string): string | true {
  const text = tidyNote(note);
  if (reason === OTHER_REASON && text === '') return 'Say what the reason is.';
  return text.length > NOTE_LIMIT ? `Use at most ${NOTE_LIMIT} characters.` : true;
}
