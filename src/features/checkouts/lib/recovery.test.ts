// Tests for the recovery words: the five states, the refusal texts, the grouping of left-out checkouts and the sentences.
import { describe, expect, it } from 'vitest';
import { checkout } from '../test/fixtures';
import { groupSkipped, recoveryState, sentTitle, skipText, summaryTitle } from './recovery';
import { utmSource } from './source';

describe('recoveryState', () => {
  it('is ready for a customer who agreed and can be reminded now', () => {
    expect(recoveryState(checkout())).toBe('ready');
  });

  it('is waiting for a customer who agreed but cannot be reminded yet', () => {
    expect(recoveryState(checkout({ canRecover: false }))).toBe('waiting');
  });

  it('is no_consent for a customer who did not agree, whatever else the row says', () => {
    expect(recoveryState(checkout({ marketingConsent: false, canRecover: false }))).toBe('no_consent');
  });

  it('is sent once the email went out, and recovered when the customer paid after it', () => {
    const emailed = { recoveryEmailedAt: '2026-01-01T10:00:00.000Z', canRecover: false };
    expect(recoveryState(checkout(emailed))).toBe('sent');
    expect(recoveryState(checkout({ ...emailed, orderId: 77 }))).toBe('recovered');
  });

  it('shows an email that went out even when the customer has since withdrawn consent', () => {
    expect(
      recoveryState(
        checkout({
          recoveryEmailedAt: '2026-01-01T10:00:00.000Z',
          marketingConsent: false,
          canRecover: false,
        }),
      ),
    ).toBe('sent');
  });
});

describe('skip reasons', () => {
  it('puts the known codes in plain words and shows an unknown code as the server wrote it', () => {
    expect(skipText('no_marketing_consent')).toBe('the customer has not agreed to marketing email');
    expect(skipText('already_emailed')).toBe('a recovery email was already sent');
    expect(skipText('mailbox_full')).toBe('mailbox full');
  });

  it('groups the left-out checkouts by reason, the biggest group first', () => {
    const groups = groupSkipped([
      { id: 1, reason: 'already_emailed' },
      { id: 2, reason: 'no_marketing_consent' },
      { id: 3, reason: 'no_marketing_consent' },
    ]);
    expect(groups.map((group) => [group.reason, group.ids])).toEqual([
      ['no_marketing_consent', [2, 3]],
      ['already_emailed', [1]],
    ]);
  });
});

describe('sentences', () => {
  it('counts reminders in the demo words', () => {
    expect(sentTitle(1)).toBe('1 reminder sent');
    expect(sentTitle(3)).toBe('3 reminders sent');
  });

  it('says how many of the checkouts were emailed', () => {
    expect(summaryTitle({ sent: 2, skipped: [{ id: 9, reason: 'already_paid' }] })).toBe(
      '2 of 3 checkouts emailed',
    );
    expect(summaryTitle({ sent: 0, skipped: [{ id: 9, reason: 'already_paid' }] })).toBe(
      '0 of 1 checkout emailed',
    );
  });
});

describe('utmSource', () => {
  it('reads the source text and gives null for a missing or empty one', () => {
    expect(utmSource(checkout())).toBe('Google');
    expect(utmSource(checkout({ utm: {} }))).toBeNull();
    expect(utmSource(checkout({ utm: { source: '  ' } }))).toBeNull();
    expect(utmSource(checkout({ utm: { source: 5 } }))).toBeNull();
  });
});
