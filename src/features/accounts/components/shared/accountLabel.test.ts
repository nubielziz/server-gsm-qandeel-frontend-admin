// Tests for how an account is named on screen: the display name (the trimmed name, else the email, else "Account #<id>", "Deleted account" once
// anonymized) and the second line of a list row (the number, the email, the country; "Guest" or "No name" instead of the email twice).
import { describe, expect, it } from 'vitest';
import { account, guest } from '../../test/fixtures';
import { accountLabel, accountSubLine, hasAccountName } from './accountLabel';

describe('accountLabel', () => {
  it('names an account by its trimmed name, else its email, else its number', () => {
    expect(accountLabel(account())).toBe('Daniel Whitmore');
    expect(accountLabel(account({ name: '  Daniel  ' }))).toBe('Daniel');
    expect(accountLabel(account({ name: '   ' }))).toBe('daniel.whitmore@mail.example');
    expect(accountLabel(account({ name: '', email: '', id: 77 }))).toBe('Account #77');
  });

  it('names an anonymized account "Deleted account", whatever its row still holds', () => {
    expect(accountLabel(account({ status: 'anonymized' }))).toBe('Deleted account');
    expect(accountLabel(account({ status: 'anonymized', name: '', email: '' }))).toBe('Deleted account');
  });

  it('knows an account with no real name', () => {
    expect(hasAccountName(account())).toBe(true);
    expect(hasAccountName(account({ name: '  ' }))).toBe(false);
  });
});

describe('accountSubLine', () => {
  it('writes the number, the email and the country', () => {
    expect(accountSubLine(account({ id: 12, email: 'ahmad@example.com', country: 'JO' }))).toBe(
      '#12 · ahmad@example.com · JO',
    );
  });

  it('does not print the email twice for an account with no name: a guest says "Guest", a login says "No name"', () => {
    expect(accountSubLine(guest({ id: 310, name: '', email: 'g@example.com', country: 'JO' }))).toBe(
      '#310 · Guest · JO',
    );
    expect(accountSubLine(account({ id: 8, name: '', country: 'DE' }))).toBe('#8 · No name · DE');
  });

  it('leaves out a country the account does not have', () => {
    expect(accountSubLine(account({ id: 9, country: '' }))).toBe('#9 · daniel.whitmore@mail.example');
  });

  it('says "Removed" for an anonymized account', () => {
    expect(accountSubLine(account({ id: 12, status: 'anonymized' }))).toBe('#12 · Removed');
  });
});
