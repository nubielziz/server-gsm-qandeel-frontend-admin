// Tests for the word helpers of the Queues & jobs tab and the failed-jobs paging.
import { describe, expect, it } from 'vitest';
import { attemptsText, pageRange } from './failed';
import { countOf } from './text';

describe('countOf', () => {
  it('puts the noun in the singular for one and in the plural for any other count', () => {
    expect(countOf(1, 'queue')).toBe('1 queue');
    expect(countOf(8, 'queue')).toBe('8 queues');
    expect(countOf(0, 'job')).toBe('0 jobs');
  });

  it('prints the count with thousands separators and keeps a noun of two words', () => {
    expect(countOf(1240, 'failed job')).toBe('1,240 failed jobs');
    expect(countOf(1, 'healthy queue')).toBe('1 healthy queue');
  });
});

describe('pageRange', () => {
  it('asks for 25 rows from the start of the page, the end not included', () => {
    expect(pageRange(1)).toEqual({ start: 0, end: 25 });
    expect(pageRange(2)).toEqual({ start: 25, end: 50 });
    expect(pageRange(3)).toEqual({ start: 50, end: 75 });
  });

  it('falls back to the first page for a page number that cannot be right', () => {
    expect(pageRange(0)).toEqual({ start: 0, end: 25 });
    expect(pageRange(-4)).toEqual({ start: 0, end: 25 });
    expect(pageRange(2.9)).toEqual({ start: 25, end: 50 });
  });
});

describe('attemptsText', () => {
  it('says how often a job was tried out of how often it may be', () => {
    expect(attemptsText({ attemptsMade: 5, maxAttempts: 5 })).toBe('5 of 5 attempts');
    expect(attemptsText({ attemptsMade: 1, maxAttempts: 3 })).toBe('1 of 3 attempts');
  });
});
