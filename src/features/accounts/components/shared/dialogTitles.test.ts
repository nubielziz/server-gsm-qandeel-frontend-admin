// Tests for the fixed titles of the account dialogs: one for each action, the name of the account in them, and the count for the actions that
// work on many accounts. The other tests of this feature open the dialogs by these titles, so a change here is a change of the contract.
import { describe, expect, it } from 'vitest';
import { account, guest } from '../../test/fixtures';
import type { AccountAction } from '../types';
import { dialogTitle } from './dialogTitles';

const DANIEL = account({ name: 'Daniel Whitmore' });

describe('dialogTitle', () => {
  it.each<[AccountAction, string]>([
    ['adjust', 'Adjust the wallet of Daniel Whitmore'],
    ['freeze', 'Put the wallet of Daniel Whitmore on hold?'],
    ['unfreeze', 'Lift the hold on the wallet of Daniel Whitmore?'],
    ['credit-limit', 'Credit limit of Daniel Whitmore'],
    ['rank', 'Change the rank of Daniel Whitmore'],
    ['suspend', 'Suspend Daniel Whitmore?'],
    ['reactivate', 'Reactivate Daniel Whitmore?'],
    ['block', 'Block Daniel Whitmore?'],
    ['unblock', 'Unblock Daniel Whitmore?'],
    ['password', 'Password of Daniel Whitmore'],
    ['signout', 'Sign Daniel Whitmore out everywhere?'],
    ['reset-2fa', 'Reset two-step sign-in of Daniel Whitmore?'],
    ['make-account', 'Make an account for Daniel Whitmore'],
    ['export', 'Export the data of Daniel Whitmore?'],
    ['anonymize', 'Anonymize Daniel Whitmore?'],
  ])('writes the title of %s', (action, title) => {
    expect(dialogTitle(action, [DANIEL])).toBe(title);
  });

  it('counts the accounts for suspend, reactivate and sign out when there are many', () => {
    const many = [DANIEL, guest(), account({ id: 9 })];
    expect(dialogTitle('suspend', many)).toBe('Suspend 3 accounts?');
    expect(dialogTitle('reactivate', many)).toBe('Reactivate 3 accounts?');
    expect(dialogTitle('signout', many)).toBe('Sign 3 accounts out everywhere?');
  });

  it('names the account when only one is left, and names the first account for every other action', () => {
    expect(dialogTitle('suspend', [DANIEL])).toBe('Suspend Daniel Whitmore?');
    expect(dialogTitle('rank', [DANIEL, guest()])).toBe('Change the rank of Daniel Whitmore');
  });

  it('names an account with no name by its email, and an anonymized one "Deleted account"', () => {
    expect(dialogTitle('block', [account({ name: '', email: 'x@mail.example' })])).toBe(
      'Block x@mail.example?',
    );
    expect(dialogTitle('block', [account({ status: 'anonymized' })])).toBe('Block Deleted account?');
  });
});
