// Tests for the SLA text of the services table: the two largest units, as the demo's ageText wrote them.
import { describe, expect, it } from 'vitest';
import { slaText } from './sla';

describe('slaText', () => {
  it.each([
    [0, '<1m'],
    [1, '1m'],
    [45, '45m'],
    [60, '1h'],
    [125, '2h 5m'],
    [1440, '1d'],
    [1500, '1d 1h'],
    [2880, '2d'],
    [4320, '3d'],
  ])('writes %i minutes as %s', (minutes, text) => {
    expect(slaText(minutes)).toBe(text);
  });

  it('never goes below zero', () => {
    expect(slaText(-5)).toBe('<1m');
  });
});
