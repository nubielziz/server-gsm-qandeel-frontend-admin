// Tests for the before / after table: which fields differ, and how values are written as text.
import { describe, expect, it } from 'vitest';
import { diffOf, isStructured, valueJson, valueText } from './diff';

describe('diffOf', () => {
  it('lists the fields that changed, before first', () => {
    expect(diffOf({ status: 'open', note: 'x' }, { status: 'completed', note: 'x', reason: 'ok' })).toEqual([
      { field: 'status', from: 'open', to: 'completed' },
      { field: 'reason', from: undefined, to: 'ok' },
    ]);
  });

  it('leaves out a field that did not change, and treats missing and null alike', () => {
    expect(diffOf({ a: 1, b: null }, { a: 1 })).toEqual([]);
    expect(diffOf({ list: [1, 2] }, { list: [1, 2] })).toEqual([]);
    expect(diffOf({ list: [1, 2] }, { list: [1, 3] })).toHaveLength(1);
  });

  it('shows a created or deleted record as all its fields', () => {
    expect(diffOf(null, { name: 'A' })).toEqual([{ field: 'name', from: undefined, to: 'A' }]);
    expect(diffOf({ name: 'A' }, null)).toEqual([{ field: 'name', from: 'A', to: undefined }]);
  });

  it('gives no lines for an entry that has no snapshots', () => {
    expect(diffOf(null, null)).toEqual([]);
    expect(diffOf(undefined, undefined)).toEqual([]);
  });

  it('calls a snapshot that is not an object "value"', () => {
    expect(diffOf('old', 'new')).toEqual([{ field: 'value', from: 'old', to: 'new' }]);
  });
});

describe('values as text', () => {
  it('writes scalars plainly and nothing as empty', () => {
    expect(valueText('x')).toBe('x');
    expect(valueText(12)).toBe('12');
    expect(valueText(false)).toBe('false');
    expect(valueText(null)).toBe('');
    expect(valueText(undefined)).toBe('');
  });

  it('writes a list or an object as JSON', () => {
    expect(valueText({ a: [1] })).toBe('{"a":[1]}');
    expect(isStructured({ a: 1 })).toBe(true);
    expect(isStructured([])).toBe(true);
    expect(isStructured('x')).toBe(false);
    expect(isStructured(null)).toBe(false);
    expect(valueJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it('keeps markup as text', () => {
    expect(valueText('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>');
  });
});
