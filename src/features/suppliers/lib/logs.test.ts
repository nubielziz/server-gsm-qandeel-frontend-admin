// Tests for how the API log reads: status colours, the message column, the order label and the pretty JSON.
import { describe, expect, it } from 'vitest';
import { codeStyle, logMessage, logOrderLabel, prettyJson } from './logs';

describe('codeStyle', () => {
  it('is green for success, amber for "slow down" and red for everything else', () => {
    expect(codeStyle(200)).toEqual({ className: 'text-good-fg', icon: 'checkCircle' });
    expect(codeStyle(204).className).toBe('text-good-fg');
    expect(codeStyle(429)).toEqual({ className: 'text-warn-fg', icon: 'clock' });
    expect(codeStyle(504)).toEqual({ className: 'text-crit-fg', icon: 'xCircle' });
    expect(codeStyle(0).className).toBe('text-crit-fg');
  });
});

describe('logMessage and logOrderLabel', () => {
  it('shows the supplier’s error, "OK" for a good call without one, and nothing for a bad call without text', () => {
    expect(logMessage({ httpStatus: 504, error: 'Gateway timeout' })).toBe('Gateway timeout');
    expect(logMessage({ httpStatus: 200, error: '' })).toBe('OK');
    expect(logMessage({ httpStatus: 500, error: '' })).toBe('');
  });

  it('prints the order without a channel prefix', () => {
    expect(logOrderLabel(48666)).toBe('#48666');
  });
});

describe('prettyJson', () => {
  it('indents objects and prints a string body as it is', () => {
    expect(prettyJson({ a: 1, b: [true] })).toBe('{\n  "a": 1,\n  "b": [\n    true\n  ]\n}');
    expect(prettyJson('plain text')).toBe('plain text');
    expect(prettyJson(null)).toBe('null');
  });
});
