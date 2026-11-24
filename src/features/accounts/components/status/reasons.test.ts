// Tests for the suspend reasons: the list the dialog offers, how a reason and a note become the one text the server keeps, and what the
// note box checks. Ports the suspend reasons of the old customer status helpers in this layout's words.
import { describe, expect, it } from 'vitest';
import {
  NOTE_LIMIT,
  OTHER_REASON,
  REASON_LIMIT,
  SUSPEND_REASONS,
  noteProblem,
  suspendReasonText,
  tidyNote,
} from './reasons';

describe('SUSPEND_REASONS', () => {
  it('offers the six reasons, ending with "Other"', () => {
    expect([...SUSPEND_REASONS]).toEqual([
      'Asked to pause the account',
      'Account may be compromised',
      'Unusual activity under review',
      'Waiting for proof of identity or payment',
      'Chargeback or payment dispute',
      'Other',
    ]);
    expect(SUSPEND_REASONS.at(-1)).toBe(OTHER_REASON);
  });
});

describe('suspendReasonText', () => {
  it('sends the reason alone when there is no note', () => {
    expect(suspendReasonText('Account may be compromised', '')).toBe('Account may be compromised');
    expect(suspendReasonText('Account may be compromised', '   ')).toBe('Account may be compromised');
  });

  it('sends "<reason>: <note>" with the note tidied', () => {
    expect(suspendReasonText('Other', '  asked   by   phone ')).toBe('Other: asked by phone');
  });

  it('cuts the text to what the server keeps', () => {
    const text = suspendReasonText('Chargeback or payment dispute', 'x'.repeat(NOTE_LIMIT));
    expect(text).toHaveLength(REASON_LIMIT);
    expect(text.startsWith('Chargeback or payment dispute: xxx')).toBe(true);
  });

  it('tidies a note', () => {
    expect(tidyNote('  a   b ')).toBe('a b');
  });
});

describe('noteProblem', () => {
  it('needs a note for "Other" and for nothing else', () => {
    expect(noteProblem('Other', '  ')).toBe('Say what the reason is.');
    expect(noteProblem('Other', 'asked by phone')).toBe(true);
    expect(noteProblem('Asked to pause the account', '')).toBe(true);
  });

  it('refuses a note over its limit', () => {
    expect(noteProblem('Asked to pause the account', 'x'.repeat(NOTE_LIMIT + 1))).toBe(
      'Use at most 120 characters.',
    );
    expect(noteProblem('Asked to pause the account', 'x'.repeat(NOTE_LIMIT))).toBe(true);
  });
});
