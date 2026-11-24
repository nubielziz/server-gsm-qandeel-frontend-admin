// Tests for the Options and Fields dialogs' text forms: option lists as lines, a select field's choices, and the field rows.
import { describe, expect, it } from 'vitest';
import type { ServiceField, ServiceOption } from '../types';
import {
  blankField,
  fieldDraft,
  fieldErrorTargets,
  repeatedNameIndex,
  toServiceField,
  withMainInput,
} from './fields';
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
    name: 'Plan name',
    label: 'Plan',
    fieldType: 'select',
    required: true,
    options: ['Basic', 'Pro'],
    regex: '',
    isMainInput: false,
  };

  it('start blank as an optional text field with no key and no name', () => {
    expect(blankField()).toEqual({
      key: '',
      name: '',
      label: '',
      fieldType: 'text',
      required: false,
      choices: '',
      regex: '',
      isMainInput: false,
    });
  });

  it('go from a saved field to a row and back, keeping its hidden key', () => {
    expect(fieldDraft(saved)).toMatchObject({
      key: 'plan',
      name: 'Plan name',
      choices: 'Basic, Pro',
      required: true,
    });
    expect(toServiceField(fieldDraft(saved))).toEqual(saved);
    expect(toServiceField(fieldDraft({ ...saved, isMainInput: true }))).toMatchObject({ isMainInput: true });
  });

  it('send no key for a new row, and keep choices only for a choice list and trim the text', () => {
    const draft = {
      ...blankField(),
      name: ' A ',
      label: ' A label ',
      fieldType: 'text' as const,
      choices: 'x, y',
    };
    const body = toServiceField(draft);
    expect(body).toMatchObject({ name: 'A', label: 'A label', options: [], isMainInput: false });
    expect(body).not.toHaveProperty('key');
  });

  it('send the label as typed, so an empty one asks the server for the name', () => {
    expect(toServiceField({ ...blankField(), name: 'Serial' })).toMatchObject({ name: 'Serial', label: '' });
  });

  it('find a name that repeats an earlier one, without regard to letter case or spaces around it', () => {
    const rows = ['Email', 'IMEI', ' email ', ''].map((name) => ({ ...blankField(), name }));
    expect(repeatedNameIndex(rows)).toBe(2);
    expect(repeatedNameIndex(rows.slice(0, 2))).toBe(-1);
    expect(repeatedNameIndex([{ ...blankField() }, { ...blankField() }])).toBe(-1);
  });

  it('turn a main input on for one row and off for the others, and off for all', () => {
    const rows = [true, false, false].map((isMainInput) => ({ ...blankField(), isMainInput }));
    expect(withMainInput(rows, 2, true).map((row) => row.isMainInput)).toEqual([false, false, true]);
    expect(withMainInput(rows, 0, false).map((row) => row.isMainInput)).toEqual([false, false, false]);
    expect(withMainInput(rows, 1, false).map((row) => row.isMainInput)).toEqual([true, false, false]);
    expect(rows.map((row) => row.isMainInput)).toEqual([true, false, false]);
  });

  it('name the inputs that show an error, and map the API’s names onto them', () => {
    const rows = [blankField(), { ...blankField(), fieldType: 'select' as const }];
    const { names, aliases } = fieldErrorTargets(rows);
    expect(names).toEqual([
      'fields.0.name',
      'fields.0.label',
      'fields.0.fieldType',
      'fields.0.required',
      'fields.0.regex',
      'fields.1.name',
      'fields.1.label',
      'fields.1.fieldType',
      'fields.1.required',
      'fields.1.regex',
      'fields.1.choices',
    ]);
    // The hidden key and the main-input flag have no cell: their messages show under the row's name. `options` is the choices of a choice list only.
    expect(aliases).toEqual({
      'fields.0.key': 'fields.0.name',
      'fields.0.isMainInput': 'fields.0.name',
      'fields.1.key': 'fields.1.name',
      'fields.1.isMainInput': 'fields.1.name',
      'fields.1.options': 'fields.1.choices',
    });
    expect(fieldErrorTargets([])).toEqual({ names: [], aliases: {} });
  });
});
