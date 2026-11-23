// Tests for the Add services flow's two address keys: what counts as a flow, that opening and closing leave the table's other keys alone,
// and that the keys written here are the ones `catalogPath` writes.
import { describe, expect, it } from 'vitest';
import { clearAddAddress, parseAddAddress, writeAddAddress } from './addAddress';
import { catalogPath } from './paths';

const params = (query: string) => new URLSearchParams(query);
const entries = (value: URLSearchParams) => [...value.entries()].sort(([a], [b]) => a.localeCompare(b));

describe('parseAddAddress', () => {
  it('reads "new" and a supplier id', () => {
    expect(parseAddAddress(params('add=new'))).toEqual({ add: 'new' });
    expect(parseAddAddress(params('add=12'))).toEqual({ add: 12 });
  });

  it('reads the way in only with a supplier', () => {
    expect(parseAddAddress(params('add=12&from=groups'))).toEqual({ add: 12, from: 'groups' });
    expect(parseAddAddress(params('add=12&from=services'))).toEqual({ add: 12, from: 'services' });
    expect(parseAddAddress(params('add=new&from=groups'))).toEqual({ add: 'new' });
    expect(parseAddAddress(params('from=groups'))).toBeNull();
  });

  it('drops a way it does not know and keeps the supplier', () => {
    expect(parseAddAddress(params('add=12&from=everything'))).toEqual({ add: 12 });
  });

  it('treats anything else as a closed flow', () => {
    for (const query of [
      '',
      'add=',
      'add=0',
      'add=-3',
      'add=007',
      'add=1.5',
      'add=abc',
      'add=NEW',
      'q=new',
    ]) {
      expect(parseAddAddress(params(query)), query).toBeNull();
    }
  });
});

describe('writeAddAddress and clearAddAddress', () => {
  it('open the flow and close it again without touching the rest of the address', () => {
    const base = params('q=unlock&chip=attention&page=2&open=7&section=prices');
    const opened = writeAddAddress(base, { add: 5, from: 'groups' });
    expect(opened.get('add')).toBe('5');
    expect(opened.get('from')).toBe('groups');
    expect(opened.get('q')).toBe('unlock');
    expect(opened.get('open')).toBe('7');
    expect(entries(clearAddAddress(opened))).toEqual(entries(base));
    // The base is a copy: it never changes.
    expect(base.has('add')).toBe(false);
  });

  it('replaces an earlier way in when the new link names none', () => {
    const opened = writeAddAddress(params('add=5&from=groups'), { add: 'new' });
    expect(opened.get('add')).toBe('new');
    expect(opened.has('from')).toBe(false);
  });

  it('write what catalogPath writes', () => {
    for (const link of [{ add: 'new' as const }, { add: 9 }, { add: 9, from: 'services' as const }]) {
      const fromBuilder = new URL(catalogPath(link), 'http://console.test').searchParams;
      expect(entries(writeAddAddress(new URLSearchParams(), link))).toEqual(entries(fromBuilder));
    }
  });
});
