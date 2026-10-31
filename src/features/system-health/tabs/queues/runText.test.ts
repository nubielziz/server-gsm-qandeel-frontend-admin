// Tests for the words of one job run in the history drawer: who started it and what its result summary says.
import { describe, expect, it } from 'vitest';
import type { JobTrigger } from '../../types';
import { summarizeResult, triggerText } from './runText';

describe('triggerText', () => {
  it('names the schedule, the staff member who ran it by hand, and an event', () => {
    expect(triggerText({ trigger: 'schedule', triggeredBy: null })).toBe('On schedule');
    expect(triggerText({ trigger: 'manual', triggeredBy: { id: 7, name: 'Dana Cohen' } })).toBe(
      'Run by Dana Cohen',
    );
    expect(triggerText({ trigger: 'event', triggeredBy: null })).toBe('Started by an event');
  });

  it('still reads when a manual run has no staff member on record', () => {
    expect(triggerText({ trigger: 'manual', triggeredBy: null })).toBe('Run by hand');
  });

  it('shows a trigger it does not know as the server wrote it instead of calling it a schedule', () => {
    expect(triggerText({ trigger: 'webhook' as JobTrigger, triggeredBy: null })).toBe('webhook');
  });
});

describe('summarizeResult', () => {
  it('lists the simple fields as words and numbers with thousands separators', () => {
    expect(summarizeResult({ suppliers: 6, prices: 1480, changed: 44 })).toBe(
      'suppliers 6 · prices 1,480 · changed 44',
    );
  });

  it('turns camelCase and snake_case keys into plain words', () => {
    expect(summarizeResult({ entriesChecked: 48213, failed_checks: 1 })).toBe(
      'entries checked 48,213 · failed checks 1',
    );
  });

  it('reads booleans as yes or no and keeps short text', () => {
    expect(summarizeResult({ dryRun: false, mode: 'full' })).toBe('dry run no · mode full');
  });

  it('leaves out what has no short reading: nested data, lists, null, empty and long text', () => {
    expect(
      summarizeResult({
        nested: { a: 1 },
        list: [1, 2],
        nothing: null,
        blank: '  ',
        essay: 'x'.repeat(80),
        sent: 12,
      }),
    ).toBe('sent 12');
  });

  it('stops after the limit', () => {
    const many = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`field${index}`, index]));
    expect(summarizeResult(many).split(' · ')).toHaveLength(6);
    expect(summarizeResult(many, 2).split(' · ')).toHaveLength(2);
  });

  it('is empty when there is no result', () => {
    expect(summarizeResult(null)).toBe('');
    expect(summarizeResult(undefined)).toBe('');
    expect(summarizeResult({})).toBe('');
    expect(summarizeResult([] as never)).toBe('');
  });
});
