// Tests for the words of the "How" switch: what each part is called and what the chosen one means.
import { describe, expect, it } from 'vitest';
import { howWords, isLinkMode, passwordHint, passwordModeOf } from './passwordModes';

describe('howWords', () => {
  it('calls the parts "Send a link" and "Temporary password"', () => {
    expect(howWords()).toEqual({ link: 'Send a link', temporary: 'Temporary password' });
  });

  it('sends the invitation again to an account that has no password yet', () => {
    expect(howWords(false)).toEqual({ link: 'Send the invitation again', temporary: 'Temporary password' });
  });
});

describe('passwordHint', () => {
  it('says the person picks the password and the link works for an hour', () => {
    expect(passwordHint('reset_link')).toMatch(
      /They pick the password and you never see it\. The link works for 1 hour\./,
    );
  });

  it('says the new invitation replaces the old one when there is no password yet', () => {
    expect(passwordHint('reset_link', false)).toMatch(/^The new invitation replaces the old one\./);
  });

  it('says a temporary password is shown once and must be changed', () => {
    const hint = passwordHint('temporary_password');
    expect(hint).toMatch(/show it to you once/);
    expect(hint).toMatch(/must change it at the next sign-in/);
  });
});

describe('the switch and the mode', () => {
  it('reads the left part as the link and the right part as a temporary password', () => {
    expect(passwordModeOf(true)).toBe('reset_link');
    expect(passwordModeOf(false)).toBe('temporary_password');
    expect(isLinkMode('reset_link')).toBe(true);
    expect(isLinkMode('temporary_password')).toBe(false);
  });
});
