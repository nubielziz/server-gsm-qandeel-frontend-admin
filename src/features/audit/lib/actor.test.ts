// Tests for the name shown for an actor.
import { describe, expect, it } from 'vitest';
import { actorText } from './actor';

describe('actorText', () => {
  it('uses the name the server saved', () => {
    expect(actorText({ actorType: 'staff', actorId: 2, actorName: ' Lina S. ' })).toBe('Lina S.');
  });

  it('falls back to System, then to the staff number', () => {
    expect(actorText({ actorType: 'system', actorId: null, actorName: null })).toBe('System');
    expect(actorText({ actorType: 'staff', actorId: 7 })).toBe('Staff #7');
    expect(actorText({ actorType: 'staff', actorId: null })).toBe('Someone');
  });

  it('names an account actor by its number, and an old client row the same way', () => {
    expect(actorText({ actorType: 'account', actorId: 7 })).toBe('Account #7');
    expect(actorText({ actorType: 'client', actorId: 5 })).toBe('Account #5');
  });

  it("keeps an old customer actor apart: its number is the old record's", () => {
    expect(actorText({ actorType: 'customer', actorId: 19 })).toBe('Customer #19');
  });

  it('treats a word it does not know like a person', () => {
    expect(actorText({ actorType: 'robot', actorId: 4 })).toBe('Staff #4');
    expect(actorText({ actorType: 'constructor', actorId: 4 })).toBe('Staff #4');
  });
});
