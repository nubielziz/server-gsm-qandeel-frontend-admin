// Tests for the Ledger tab's address parameters and the API filters they become.
import { describe, expect, it } from 'vitest';
import {
  clearLedgerFilters,
  hasLedgerFilters,
  normalizeLedgerSearch,
  parseLedgerFilters,
  toLedgerListFilters,
  writeLedgerFilters,
} from './ledgerView';

const params = (text: string) => new URLSearchParams(text);

describe('parseLedgerFilters', () => {
  it('reads the search, the type and the account', () => {
    expect(parseLedgerFilters(params('q=hold&kind=order_hold&account=bank'))).toEqual({
      q: 'hold',
      kind: 'order_hold',
      account: 'bank',
    });
  });

  it('drops a type the console does not know and a malformed account', () => {
    expect(parseLedgerFilters(params('kind=toString&account=Bank!'))).toEqual({
      q: '',
      kind: '',
      account: '',
    });
  });
});

describe('writeLedgerFilters', () => {
  it('changes one filter and keeps the rest of the address', () => {
    const next = writeLedgerFilters(params('journal=25&kind=deposit'), { q: 'PAY-1048' });
    expect(next.toString()).toBe('journal=25&kind=deposit&q=PAY-1048');
  });

  it('leaves no trace of an empty filter', () => {
    expect(writeLedgerFilters(params('kind=deposit&q=a'), { kind: '', q: '' }).toString()).toBe('');
  });

  it('clears the filters and the page, and nothing else', () => {
    expect(clearLedgerFilters(params('q=a&kind=deposit&account=bank&page=3&journal=2')).toString()).toBe(
      'journal=2',
    );
  });
});

describe('hasLedgerFilters', () => {
  it('counts the account and ignores blank search text', () => {
    expect(hasLedgerFilters({ q: '  ', kind: '', account: '' })).toBe(false);
    expect(hasLedgerFilters({ q: '', kind: '', account: 'bank' })).toBe(true);
  });
});

describe('normalizeLedgerSearch', () => {
  it('turns a journal number into the id', () => {
    expect(normalizeLedgerSearch('JRN-00025')).toBe('25');
    expect(normalizeLedgerSearch(' #25 ')).toBe('25');
    expect(normalizeLedgerSearch('jrn-1962')).toBe('1962');
  });

  it('sends any other text as it is, trimmed', () => {
    expect(normalizeLedgerSearch(' Hold for ORD-48100 ')).toBe('Hold for ORD-48100');
  });
});

describe('toLedgerListFilters', () => {
  it('names the account filter accountKind and leaves out empty ones', () => {
    expect(toLedgerListFilters({ q: '', kind: 'deposit', account: 'bank' })).toEqual({
      kind: 'deposit',
      accountKind: 'bank',
    });
    expect(toLedgerListFilters({ q: '#7', kind: '', account: '' })).toEqual({ q: '7' });
  });
});
