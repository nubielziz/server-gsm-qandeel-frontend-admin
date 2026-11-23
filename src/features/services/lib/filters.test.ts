// Tests for the page of a list kept in the address: reading it (anything unknown is page 1) and writing it (the first page is left out).
import { describe, expect, it } from 'vitest';
import { parsePage, writeView } from './filters';

const params = (text: string) => new URLSearchParams(text);

describe('parsePage', () => {
  it('reads a page number', () => {
    expect(parsePage(params('page=4'))).toBe(4);
  });

  it('reads a missing, malformed or non-positive page as the first', () => {
    for (const text of ['', 'page=abc', 'page=0', 'page=-2', 'page=1.5', 'page=']) {
      expect(parsePage(params(text))).toBe(1);
    }
  });
});

describe('writeView', () => {
  it('writes a page after the first and keeps the rest of the address', () => {
    expect(writeView(params('tab=inventory&service=4'), { page: 3 }).toString()).toBe(
      'tab=inventory&service=4&page=3',
    );
  });

  it('leaves the first page out and removes an old page', () => {
    expect(writeView(params('service=4&page=3'), { page: 1 }).toString()).toBe('service=4');
  });

  it('changes nothing when it is given no page', () => {
    expect(writeView(params('page=2'), {}).toString()).toBe('page=2');
  });
});
