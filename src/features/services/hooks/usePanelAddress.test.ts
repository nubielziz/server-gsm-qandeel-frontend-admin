// Tests for the service panel's address: `open` and `section` read from and written into the Catalog address.
import { describe, expect, it } from 'vitest';
import { readPanelAddress, writePanelAddress } from './usePanelAddress';

const params = (query: string) => new URLSearchParams(query);

describe('readPanelAddress', () => {
  it('reads the open service and the section', () => {
    expect(readPanelAddress(params('open=7&section=activity'))).toEqual({ open: 7, section: 'activity' });
    expect(readPanelAddress(params('open=12'))).toEqual({ open: 12, section: null });
  });

  it('is closed without an open service, even when a section is named', () => {
    expect(readPanelAddress(params(''))).toEqual({ open: null, section: null });
    expect(readPanelAddress(params('section=prices'))).toEqual({ open: null, section: null });
  });

  it('ignores an open that is not a positive whole number', () => {
    for (const bad of ['', 'abc', '0', '-3', '1.5', '007', '99999999999999999999']) {
      expect(readPanelAddress(params(`open=${bad}&section=prices`))).toEqual({ open: null, section: null });
    }
  });

  it('drops a section that is not a section of the panel, and keeps the service', () => {
    expect(readPanelAddress(params('open=7&section=nothing'))).toEqual({ open: 7, section: null });
  });

  it('names every section of the contract', () => {
    for (const id of ['details', 'order-form', 'suppliers', 'prices', 'shop', 'activity']) {
      expect(readPanelAddress(params(`open=3&section=${id}`)).section).toBe(id);
    }
  });
});

describe('writePanelAddress', () => {
  it('names a service and keeps the rest of the address', () => {
    expect(writePanelAddress(params('chip=attention&page=2'), { open: 7 }).toString()).toBe(
      'chip=attention&page=2&open=7',
    );
  });

  it('names a section with the service', () => {
    expect(writePanelAddress(params(''), { open: 7, section: 'prices' }).toString()).toBe(
      'open=7&section=prices',
    );
  });

  it('moves to another service and drops the section that belonged to the first', () => {
    expect(writePanelAddress(params('open=5&section=prices&q=tool'), { open: 9 }).toString()).toBe(
      'open=9&q=tool',
    );
    expect(writePanelAddress(params('open=5&section=prices'), { open: 9, section: 'shop' }).toString()).toBe(
      'open=9&section=shop',
    );
  });

  it('closes by dropping both parameters, and keeps the rest', () => {
    expect(writePanelAddress(params('q=tool&open=5&section=prices&page=2'), { open: null }).toString()).toBe(
      'q=tool&page=2',
    );
  });

  it('does not change the address it was given', () => {
    const base = params('open=5');
    writePanelAddress(base, { open: 9, section: 'shop' });
    expect(base.toString()).toBe('open=5');
  });
});
