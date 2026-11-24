// Tests for the words of the Activity Log rows.
import { describe, expect, it } from 'vitest';
import { whatText, whoText } from './activityText';

describe('whatText', () => {
  it('reads "<action> <record>" with the name the record had at the time', () => {
    expect(whatText({ action: 'edited details of', entityLabel: 'Zain Mobile Hub' })).toBe(
      'edited details of Zain Mobile Hub',
    );
  });

  it('gives the action alone when the record has no name', () => {
    expect(whatText({ action: 'signed out', entityLabel: null })).toBe('signed out');
    expect(whatText({ action: 'signed out', entityLabel: '  ' })).toBe('signed out');
    expect(whatText({ action: 'signed out' })).toBe('signed out');
  });
});

describe('whoText', () => {
  it('names the person the server saved, trimmed', () => {
    expect(whoText({ actorType: 'staff', actorId: 2, actorName: ' Lina S. ' })).toBe('Lina S.');
  });

  it('says System for the system and Someone for an actor with no number', () => {
    expect(whoText({ actorType: 'system', actorId: null, actorName: null })).toBe('System');
    expect(whoText({ actorType: 'staff', actorId: null, actorName: null })).toBe('Someone');
  });

  it('falls back to a word and a number for a person the server did not name', () => {
    expect(whoText({ actorType: 'staff', actorId: 3, actorName: null })).toBe('Staff #3');
    expect(whoText({ actorType: 'account', actorId: 7, actorName: null })).toBe('Account #7');
    expect(whoText({ actorType: 'client', actorId: 7, actorName: null })).toBe('Account #7');
  });

  it('keeps an old customer number as the old record’s, never as an account', () => {
    expect(whoText({ actorType: 'customer', actorId: 19, actorName: null })).toBe('Customer #19');
  });

  it('treats an unknown kind like a staff member', () => {
    expect(whoText({ actorType: 'robot', actorId: 4, actorName: null })).toBe('Staff #4');
  });
});
