// Tests for the change mark under each key figure: percent and percentage points, better or worse, and the empty cases.
import { describe, expect, it } from 'vitest';
import { delta } from './delta';

describe('delta', () => {
  it('words a rise as a percentage and calls it better', () => {
    expect(delta(150, 100)).toEqual({ kind: 'move', direction: 'up', good: true, text: '50.0%' });
  });

  it('words a fall as worse', () => {
    expect(delta(80, 100)).toEqual({ kind: 'move', direction: 'down', good: false, text: '20.0%' });
  });

  it('counts a fall as better when lower is better (turnaround time)', () => {
    expect(delta(600, 900, { lowerBetter: true })).toEqual({
      kind: 'move',
      direction: 'down',
      good: true,
      text: '33.3%',
    });
    expect(delta(1000, 900, { lowerBetter: true })).toMatchObject({ direction: 'up', good: false });
  });

  it('gives percentage points for a figure that already is a percentage', () => {
    expect(delta(95, 90, { kind: 'pp' })).toEqual({
      kind: 'move',
      direction: 'up',
      good: true,
      text: '5.0 pts',
    });
    expect(delta(88.5, 90, { kind: 'pp' })).toMatchObject({ direction: 'down', text: '1.5 pts' });
  });

  it('says "No change" under 0.05', () => {
    expect(delta(100, 100)).toEqual({ kind: 'flat' });
    expect(delta(100.02, 100)).toEqual({ kind: 'flat' });
    expect(delta(90.04, 90, { kind: 'pp' })).toEqual({ kind: 'flat' });
  });

  it('says "No earlier data" when there is no previous figure, or it was zero', () => {
    expect(delta(10, null)).toEqual({ kind: 'missing', text: 'No earlier data' });
    expect(delta(10, undefined)).toEqual({ kind: 'missing', text: 'No earlier data' });
    expect(delta(10, 0)).toEqual({ kind: 'missing', text: 'No earlier data' });
  });

  it('says "No data yet" when this period has no figure', () => {
    expect(delta(null, 90, { kind: 'pp' })).toEqual({ kind: 'missing', text: 'No data yet' });
    expect(delta(Number.NaN, 90)).toEqual({ kind: 'missing', text: 'No data yet' });
  });

  it('reads a profit that recovers from a loss as better', () => {
    expect(delta(-50, -100)).toMatchObject({ direction: 'up', good: true, text: '50.0%' });
  });
});
