// Tests for the filters in the address: reading them, the API filters they make, and writing them back.
import { describe, expect, it } from 'vitest';
import { clearView, hasFilters, parseActor, parseView, toFilters, toRefineFilters, writeView } from './view';

const params = (query: string) => new URLSearchParams(query);

describe('parseView', () => {
  it('reads the six filters', () => {
    expect(parseView(params('q=price&actor=2&type=order&record=48&from=2026-03-01&to=2026-03-05'))).toEqual({
      q: 'price',
      actor: '2',
      type: 'order',
      record: '48',
      from: '2026-03-01',
      to: '2026-03-05',
    });
  });

  it('starts empty', () => {
    expect(parseView(params(''))).toEqual({ q: '', actor: '', type: '', record: '', from: '', to: '' });
    expect(hasFilters(parseView(params('')))).toBe(false);
  });

  it('drops values that cannot be right', () => {
    expect(parseView(params('actor=admin&record=7a&from=yesterday&to=2026-3-5'))).toMatchObject({
      actor: '',
      record: '',
      from: '',
      to: '',
    });
    expect(parseActor('system')).toBe('system');
    expect(parseActor('-4')).toBe('');
  });
});

describe('the old words of an account', () => {
  it('reads merchant and client as the record type account, with the number kept', () => {
    expect(parseView(params('type=merchant&record=5'))).toMatchObject({ type: 'account', record: '5' });
    expect(parseView(params('type=clients&record=5'))).toMatchObject({ type: 'account', record: '5' });
  });

  it('reads customer as account and drops the number: it belongs to the old record, not to an account', () => {
    expect(parseView(params('type=customer&record=19'))).toMatchObject({ type: 'account', record: '' });
  });

  it('leaves every other type as written', () => {
    expect(parseView(params('type=order'))).toMatchObject({ type: 'order' });
    expect(parseView(params('type=export_job'))).toMatchObject({ type: 'export_job' });
  });
});

describe('toFilters', () => {
  it('sends a person as staff with an id and the system as its own type', () => {
    expect(toFilters(parseView(params('actor=3')))).toEqual({ actorType: 'staff', actorId: 3 });
    expect(toFilters(parseView(params('actor=system')))).toEqual({ actorType: 'system' });
  });

  it('sends the record type, the days and the trimmed search', () => {
    expect(toFilters(parseView(params('q=%20price%20&type=service&from=2026-03-01&to=2026-03-05')))).toEqual({
      q: 'price',
      entityType: 'service',
      from: '2026-03-01',
      to: '2026-03-05',
    });
  });

  it('sends a record id only beside its type, as a number', () => {
    expect(toFilters(parseView(params('type=order&record=7')))).toEqual({
      entityType: 'order',
      entityId: 7,
    });
    expect(toFilters(parseView(params('record=7')))).toEqual({});
  });

  it('asks for one account by its number, not by a type and an id', () => {
    expect(toFilters(parseView(params('type=account&record=7')))).toEqual({ accountId: 7 });
    expect(toFilters(parseView(params('type=account')))).toEqual({ entityType: 'account' });
  });

  it('counts a record id as a filter', () => {
    expect(hasFilters(parseView(params('record=7')))).toBe(true);
  });

  it('sends nothing when nothing is chosen', () => {
    expect(toFilters(parseView(params('q=%20%20')))).toEqual({});
  });
});

describe('toRefineFilters', () => {
  it('makes one equality filter per set value', () => {
    expect(toRefineFilters({ actorType: 'staff', actorId: 3, q: '' })).toEqual([
      { field: 'actorType', operator: 'eq', value: 'staff' },
      { field: 'actorId', operator: 'eq', value: 3 },
    ]);
  });
});

describe('writeView', () => {
  it('changes some filters and keeps the rest of the address', () => {
    const next = writeView(params('type=order&order=5'), { actor: 'system' });
    expect(next.toString()).toBe('type=order&order=5&actor=system');
  });

  it('removes a filter that is emptied', () => {
    expect(writeView(params('q=a&type=order'), { q: '' }).toString()).toBe('type=order');
  });

  it('keeps the record id when other filters change, and clears it with the rest', () => {
    expect(writeView(params('type=account&record=7'), { actor: '2' }).toString()).toBe(
      'type=account&record=7&actor=2',
    );
    expect(writeView(params('type=account&record=7'), { record: '' }).toString()).toBe('type=account');
    expect(writeView(params('type=merchant&record=7'), { actor: '2' }).toString()).toBe(
      'type=account&record=7&actor=2',
    );
  });

  it('clears every filter but leaves other parameters', () => {
    expect(
      clearView(params('q=a&actor=2&type=order&record=3&from=2026-03-01&to=2026-03-02&order=9')).toString(),
    ).toBe('order=9');
  });
});
