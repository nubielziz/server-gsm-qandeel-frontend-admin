// Tests for how an action and an entry number read.
import { describe, expect, it } from 'vitest';
import { actionText, auditCode } from './verb';

describe('actionText', () => {
  it('keeps the demo’s phrase', () => {
    expect(actionText('changed price of')).toBe('changed price of');
    expect(actionText('  logged in ')).toBe('logged in');
  });

  it('turns a code into words', () => {
    expect(actionText('order.completed')).toBe('order completed');
    expect(actionText('service_price-changed')).toBe('service price changed');
  });
});

describe('auditCode', () => {
  it('pads to four digits like the demo', () => {
    expect(auditCode(42)).toBe('AUD-0042');
    expect(auditCode(12345)).toBe('AUD-12345');
  });
});
