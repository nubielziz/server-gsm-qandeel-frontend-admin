// Tests for the address helpers every Finance tab uses: page, open record, parameters and sort.
import { describe, expect, it } from 'vitest';
import { parseOpenId, parsePage, parseSort, withParams, writePage, writeSort } from './url';

const params = (text: string) => new URLSearchParams(text);
const FIELDS = ['createdAt', 'id'] as const;
const DEFAULT = { field: 'createdAt', order: 'desc' } as const;

describe('page and open record', () => {
  it('read a page number and an id, and ignore anything else', () => {
    expect(parsePage(params('page=3'))).toBe(3);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=x'))).toBe(1);
    expect(parseOpenId(params('journal=25'), 'journal')).toBe(25);
    expect(parseOpenId(params('journal=ORD-1'), 'journal')).toBeNull();
  });

  it('write page 1 as no parameter', () => {
    expect(writePage(params('page=3&q=a'), 1).toString()).toBe('q=a');
    expect(writePage(params('q=a'), 2).toString()).toBe('q=a&page=2');
  });
});

describe('withParams', () => {
  it('sets, replaces and removes parameters without touching the rest', () => {
    expect(withParams(params('a=1&b=2'), { a: undefined, b: 5, c: 'x' }).toString()).toBe('b=5&c=x');
    expect(withParams(params('a=1'), { a: '' }).toString()).toBe('');
  });
});

describe('sort', () => {
  it('reads a sort the server can do, else the default', () => {
    expect(parseSort(params('sort=id&dir=asc'), FIELDS, DEFAULT)).toEqual({ field: 'id', order: 'asc' });
    expect(parseSort(params('sort=id'), FIELDS, DEFAULT)).toEqual({ field: 'id', order: 'desc' });
    expect(parseSort(params('sort=memo&dir=asc'), FIELDS, DEFAULT)).toEqual(DEFAULT);
  });

  it('writes the default sort as no parameters', () => {
    expect(writeSort(params('sort=id&dir=asc'), DEFAULT, DEFAULT).toString()).toBe('');
    expect(writeSort(params(''), { field: 'id', order: 'asc' }, DEFAULT).toString()).toBe('sort=id&dir=asc');
  });
});
