// Tests for the filters in the address: reading them, the API filters they make, and writing them back.
import { describe, expect, it } from 'vitest';
import { clearView, hasFilters, parseActor, parseView, toFilters, toRefineFilters, writeView } from './view';

const params = (query: string) => new URLSearchParams(query);

describe('parseView', () => {
  it('reads the five filters', () => {
    expect(parseView(params('q=price&actor=2&type=order&from=2026-03-01&to=2026-03-05'))).toEqual({
      q: 'price',
      actor: '2',
      type: 'order',
      from: '2026-03-01',
      to: '2026-03-05',
    });
  });

  it('starts empty', () => {
    expect(parseView(params(''))).toEqual({ q: '', actor: '', type: '', from: '', to: '' });
    expect(hasFilters(parseView(params('')))).toBe(false);
  });

  it('drops values that cannot be right', () => {
    expect(parseView(params('actor=admin&from=yesterday&to=2026-3-5'))).toMatchObject({
      actor: '',
      from: '',
      to: '',
    });
    expect(parseActor('system')).toBe('system');
    expect(parseActor('-4')).toBe('');
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

  it('clears every filter but leaves other parameters', () => {
    expect(clearView(params('q=a&actor=2&type=order&from=2026-03-01&to=2026-03-02&order=9')).toString()).toBe(
      'order=9',
    );
  });
});
