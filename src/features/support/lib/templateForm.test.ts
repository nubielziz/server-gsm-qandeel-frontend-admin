// Tests for the template form: trimming what is sent and sending only what changed.
import { describe, expect, it } from 'vitest';
import type { ReplyTemplate } from '../types';
import { changedTemplateFields, cleanTemplate } from './templateForm';

const template: ReplyTemplate = {
  id: 4,
  title: 'Refund approved',
  category: 'refund',
  locale: 'en',
  body: 'Hi {{name}}, your refund is on its way.',
  shortcut: '/refund',
  createdBy: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const same = {
  title: template.title,
  category: template.category,
  locale: template.locale,
  shortcut: template.shortcut,
  body: template.body,
};

describe('cleanTemplate', () => {
  it('trims the text fields', () => {
    expect(cleanTemplate({ ...same, title: '  A  ', shortcut: ' /a ', body: '\nHello\n' })).toEqual({
      ...same,
      title: 'A',
      shortcut: '/a',
      body: 'Hello',
    });
  });
});

describe('changedTemplateFields', () => {
  it('sends nothing when nothing changed, even with stray spaces', () => {
    expect(changedTemplateFields(template, same)).toEqual({});
    expect(changedTemplateFields(template, { ...same, title: ' Refund approved ' })).toEqual({});
  });

  it('sends only the fields that changed', () => {
    expect(
      changedTemplateFields(template, { ...same, title: 'Refund sent', category: 'billing', locale: 'ar' }),
    ).toEqual({ title: 'Refund sent', category: 'billing', locale: 'ar' });
    expect(changedTemplateFields(template, { ...same, shortcut: '' })).toEqual({ shortcut: '' });
  });
});
