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
});
