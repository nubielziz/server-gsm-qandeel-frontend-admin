// Tests for the Custom Fields section's text forms: a select field's choices, and the field rows (the hidden key and pattern, the error targets).
import { describe, expect, it } from 'vitest';
import type { ServiceField } from '../types';
import {
  blankField,
  fieldDraft,
  fieldErrorTargets,
  repeatedNameIndex,
  toServiceField,
  withMainInput,
} from './fields';
import { choicesText, FIELD_TYPE_OPTIONS, parseChoices } from './options';

describe('choices', () => {
  it('writes and reads a comma-separated line', () => {
    expect(choicesText(['Red', 'Green'])).toBe('Red, Green');
    expect(parseChoices(' Red, ,Green ,')).toEqual(['Red', 'Green']);
    expect(parseChoices('')).toEqual([]);
  });
});

describe('the field type menu', () => {
  it('offers the five types, the IMEI type last, as "IMEI (15 digits)"', () => {
    expect(FIELD_TYPE_OPTIONS.map((option) => [option.value, option.label])).toEqual([
      ['text', 'Text'],
      ['number', 'Number'],
      ['select', 'Choice list'],
      ['textarea', 'Long text'],
      ['imei', 'IMEI (15 digits)'],
    ]);
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
    regex: '^\\d{15}$',
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

  it('go from a saved field to a row and back, keeping its hidden key and its hidden pattern', () => {
    expect(fieldDraft(saved)).toMatchObject({
      key: 'plan',
      name: 'Plan name',
      choices: 'Basic, Pro',
      required: true,
      regex: '^\\d{15}$',
    });
    expect(toServiceField(fieldDraft(saved))).toEqual(saved);
    expect(toServiceField(fieldDraft({ ...saved, isMainInput: true }))).toMatchObject({ isMainInput: true });
  });

  it('keep the IMEI type and the hidden pattern of a saved field through a row and back', () => {
    // The pattern is untrimmed on purpose: like any saved field's (decision 030), it goes back exactly as it came.
    const imei: ServiceField = {
      key: 'imei',
      name: 'IMEI',
      label: 'IMEI',
      fieldType: 'imei',
      required: true,
      options: [],
      regex: ' ^\\d{15}$ ',
      isMainInput: true,
    };
    expect(fieldDraft(imei)).toMatchObject({ fieldType: 'imei', choices: '', regex: ' ^\\d{15}$ ' });
    expect(toServiceField(fieldDraft(imei))).toEqual(imei);
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

  it("send a saved field's pattern back untouched, and an empty one for a new row", () => {
    // Nobody types a pattern here, so it is not trimmed or changed: the supplier import made it and it keeps protecting orders.
    const odd = { ...saved, regex: '  ^[A-Z]{2}\\d+$ ' };
    expect(toServiceField(fieldDraft(odd))).toMatchObject({ key: 'plan', regex: '  ^[A-Z]{2}\\d+$ ' });
    expect(toServiceField(fieldDraft(saved))).toMatchObject({ regex: '^\\d{15}$' });
    const added = toServiceField({ ...blankField(), name: 'Serial' });
    expect(added).toMatchObject({ name: 'Serial', regex: '' });
    expect(added).not.toHaveProperty('key');
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
      'fields.1.name',
      'fields.1.label',
      'fields.1.fieldType',
      'fields.1.required',
      'fields.1.choices',
    ]);
    // The hidden key, the hidden pattern and the main-input flag have no cell: their messages show under the row's name. `options` is the
    // choices of a choice list only.
    expect(aliases).toEqual({
      'fields.0.key': 'fields.0.name',
      'fields.0.regex': 'fields.0.name',
      'fields.0.isMainInput': 'fields.0.name',
      'fields.1.key': 'fields.1.name',
      'fields.1.regex': 'fields.1.name',
      'fields.1.isMainInput': 'fields.1.name',
      'fields.1.options': 'fields.1.choices',
    });
    expect(fieldErrorTargets([])).toEqual({ names: [], aliases: {} });
  });
});
