// Tests for the words of a consent record: the document with its version when it has one, else the purpose in words.
import { describe, expect, it } from 'vitest';
import { consentLabel } from './consentLabel';

describe('consentLabel', () => {
  it('shows the document with its version when the record has one', () => {
    expect(consentLabel({ purpose: 'terms', document: 'Terms of service v3.2' })).toBe(
      'Terms of service v3.2',
    );
  });

  it('says the purpose in words when there is no document', () => {
    expect(consentLabel({ purpose: 'withdrawal_waiver', document: null })).toBe(
      'Digital service starts now, right of withdrawal is waived',
    );
    expect(consentLabel({ purpose: 'marketing', document: null })).toBe('Marketing emails (opt-in)');
    expect(consentLabel({ purpose: 'terms', document: null })).toBe('Terms of service');
    expect(consentLabel({ purpose: 'privacy', document: null })).toBe('Privacy policy');
    expect(consentLabel({ purpose: 'refund_policy', document: null })).toBe('Refund policy');
  });

  it('shows a purpose it does not know as readable text', () => {
    expect(consentLabel({ purpose: 'cookie_banner', document: null })).toBe('Cookie banner');
    expect(consentLabel({ purpose: 'constructor', document: null })).toBe('Constructor');
  });
});
