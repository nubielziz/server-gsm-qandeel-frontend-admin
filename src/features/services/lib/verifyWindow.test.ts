// Tests for the verification window rule and the words of the two merchant switches, shared by the Add form and the Overview part.
import { describe, expect, it } from 'vitest';
import { CANCEL_HINT, MAX_VERIFY_WINDOW_H, VERIFY_HINT, WINDOW_HINT, windowProblem } from './verifyWindow';

describe('windowProblem', () => {
  it('is fine while verification is off, whatever the box holds', () => {
    expect(windowProblem({ verify: false, verifyWindowH: 'abc' })).toBe(true);
    expect(windowProblem({ verify: false, verifyWindowH: '0' })).toBe(true);
  });

  it('accepts whole hours from 1 to the largest window', () => {
    expect(windowProblem({ verify: true, verifyWindowH: '1' })).toBe(true);
    expect(windowProblem({ verify: true, verifyWindowH: ' 48 ' })).toBe(true);
    expect(windowProblem({ verify: true, verifyWindowH: String(MAX_VERIFY_WINDOW_H) })).toBe(true);
  });

  it('refuses 0 with verification on, because the button would never appear on the website', () => {
    expect(windowProblem({ verify: true, verifyWindowH: '0' })).toBe('Enter the hours, 1 to 720.');
  });

  it('names the range for anything else', () => {
    for (const text of ['', '-1', '1.5', '721', 'x']) {
      expect(windowProblem({ verify: true, verifyWindowH: text })).toBe('Enter the hours, 1 to 720.');
    }
  });
});

describe('the words of the switches', () => {
  it('say what a merchant may do, and no longer promise that 0 means no window', () => {
    expect(CANCEL_HINT).toBe(
      'A merchant may cancel an order that was not sent yet. Website orders of this service wait 2 minutes before they are sent, so there is time to cancel.',
    );
    expect(VERIFY_HINT).toBe(
      "A merchant may ask once for a check of a completed order's result, inside the window below. The request shows in Orders, under Verification.",
    );
    expect(WINDOW_HINT).not.toMatch(/0 means no window/);
  });
});
