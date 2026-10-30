// Tests for the Options and Fields dialogs' text forms: option lists as lines, a select field's choices, and the field rows.
import { describe, expect, it } from 'vitest';
import type { ServiceField, ServiceOption } from '../types';
import { blankField, fieldDraft, fieldErrorTargets, repeatedKeyIndex, toServiceField } from './fields';
import {
  blankValueLine,
  choicesText,
  entriesText,
  optionLines,
  parseChoices,
  parseOptionLines,
} from './options';

const option = (
  list: ServiceOption['list'],
  value: string,
  label = value,
  supplierValue = '',
): ServiceOption => ({
  list,
  value,
  label,
  supplierValue,
});

describe('option lines', () => {
  const saved = [
    option('model', 'iphone15', 'iPhone 15'),
    option('model', 'iphone14', 'iPhone 14', 'IP14'),
    option('network', 'att', 'AT&T USA', 'ATT'),
    option('mep', 'plain'),
  ];

  it('writes one list as lines of value | label | supplier value, leaving out empty trailing parts', () => {
    expect(optionLines(saved, 'model')).toBe('iphone15 | iPhone 15\niphone14 | iPhone 14 | IP14');
    expect(optionLines(saved, 'network')).toBe('att | AT&T USA | ATT');
    expect(optionLines(saved, 'mep')).toBe('plain | plain');
    expect(optionLines(saved, 'model').split('\n')).toHaveLength(2);
  });

  it('reads lines back, with the label defaulting to the value', () => {
    expect(parseOptionLines('a\nb | B\n\n  c | C | sup  \n', 'mep')).toEqual([
      option('mep', 'a'),
      option('mep', 'b', 'B'),
      option('mep', 'c', 'C', 'sup'),
    ]);
  });

  it('round-trips a list', () => {
    expect(parseOptionLines(optionLines(saved, 'model'), 'model')).toEqual(
      saved.filter((entry) => entry.list === 'model'),
    );
  });

  it('finds the first line that has a label but no value', () => {
    expect(blankValueLine('a\n| label\nb')).toBe(2);
    expect(blankValueLine('a\n\nb')).toBeNull();
    expect(blankValueLine('')).toBeNull();
  });

  it('counts entries', () => {
    expect(entriesText(1)).toBe('1 entry');
    expect(entriesText(0)).toBe('0 entries');
  });
});

describe('choices', () => {
  it('writes and reads a comma-separated line', () => {
    expect(choicesText(['Red', 'Green'])).toBe('Red, Green');
    expect(parseChoices(' Red, ,Green ,')).toEqual(['Red', 'Green']);
    expect(parseChoices('')).toEqual([]);
  });
});

describe('field rows', () => {
  const saved: ServiceField = {
    key: 'plan',
    label: 'Plan',
    fieldType: 'select',
    required: true,
    options: ['Basic', 'Pro'],
    regex: '',
    supplierKey: 'p',
  };

  it('start blank as an optional text field', () => {
    expect(blankField()).toEqual({
      key: '',
      label: '',
      fieldType: 'text',
      required: false,
      choices: '',
      regex: '',
      supplierKey: '',
    });
  });

  it('go from a saved field to a row and back', () => {
    expect(fieldDraft(saved)).toMatchObject({ choices: 'Basic, Pro', required: true });
    expect(toServiceField(fieldDraft(saved))).toEqual(saved);
  });

  it('keep choices only for a choice list and trim the text', () => {
    const draft = { ...blankField(), key: ' a ', label: ' A ', fieldType: 'text' as const, choices: 'x, y' };
    expect(toServiceField(draft)).toMatchObject({ key: 'a', label: 'A', options: [] });
  });

  it('find a key that repeats an earlier one', () => {
    const rows = ['a', 'b', ' a ', ''].map((key) => ({ ...blankField(), key }));
    expect(repeatedKeyIndex(rows)).toBe(2);
    expect(repeatedKeyIndex(rows.slice(0, 2))).toBe(-1);
    expect(repeatedKeyIndex([{ ...blankField() }, { ...blankField() }])).toBe(-1);
  });

  it('name the inputs that show an error, and map the API’s `options` onto the choices of a choice list only', () => {
    const rows = [blankField(), { ...blankField(), fieldType: 'select' as const }];
    const { names, aliases } = fieldErrorTargets(rows);
    expect(names).toEqual([
      'fields.0.key',
      'fields.0.label',
      'fields.0.fieldType',
      'fields.0.required',
      'fields.0.regex',
      'fields.0.supplierKey',
      'fields.1.key',
      'fields.1.label',
      'fields.1.fieldType',
      'fields.1.required',
      'fields.1.regex',
      'fields.1.supplierKey',
      'fields.1.choices',
    ]);
    expect(aliases).toEqual({ 'fields.1.options': 'fields.1.choices' });
    expect(fieldErrorTargets([])).toEqual({ names: [], aliases: {} });
  });
});
