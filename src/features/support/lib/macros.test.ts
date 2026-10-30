// Tests for the reply template variables: filling the three documented ones, leaving others visible, and choosing the templates that
// fit a ticket.
import { describe, expect, it } from 'vitest';
import type { ReplyTemplate } from '../types';
import { fillTemplate, SAMPLE_VALUES, templatesFor, ticketValues, unknownVariables } from './macros';

const values = { name: 'Jessica', order: 'SF-20487', eta: '1d' };

describe('fillTemplate', () => {
  it('fills the three documented variables, every time they appear', () => {
    expect(fillTemplate('Hi {{name}}, {{order}} takes {{eta}}. Thanks {{name}}.', values)).toBe(
      'Hi Jessica, SF-20487 takes 1d. Thanks Jessica.',
    );
  });

  it('accepts spaces inside the braces', () => {
    expect(fillTemplate('Hi {{ name }} / {{order }}', values)).toBe('Hi Jessica / SF-20487');
  });

  it('leaves an unknown variable visible, so a typo is seen before it is sent', () => {
    expect(fillTemplate('Hi {{name}}, your {{code}} and {{ order.id }}', values)).toBe(
      'Hi Jessica, your {{code}} and {{ order.id }}',
    );
  });

  it('does not touch single braces (the demo’s old form) or text without variables', () => {
    expect(fillTemplate('Hi {name}', values)).toBe('Hi {name}');
    expect(fillTemplate('No variables here.', values)).toBe('No variables here.');
  });

  it('does not run dollar patterns of the replacement text', () => {
    expect(fillTemplate('Hi {{name}}', { ...values, name: "$& $1 $'" })).toBe("Hi $& $1 $'");
  });
});

describe('unknownVariables', () => {
  it('lists the undocumented ones once, in order', () => {
    expect(unknownVariables('{{name}} {{b}} {{a}} {{b}} {{order}}')).toEqual(['b', 'a']);
    expect(unknownVariables('Nothing here')).toEqual([]);
  });
});

describe('ticketValues', () => {
  it('uses the first name, the order number and the service’s usual time', () => {
    expect(ticketValues('Jessica', { label: 'SF-20487', slaMinutes: 90 })).toEqual({
      name: 'Jessica',
      order: 'SF-20487',
      eta: '1h 30m',
    });
  });

  it('falls back to the demo’s plain words without an order', () => {
    expect(ticketValues('Samira', null)).toEqual({ name: 'Samira', order: 'your order', eta: 'a few hours' });
  });

  it('has sample values for the preview', () => {
    expect(Object.keys(SAMPLE_VALUES)).toEqual(['name', 'order', 'eta']);
  });
});

describe('templatesFor', () => {
  const template = (id: number, category: ReplyTemplate['category']): ReplyTemplate => ({
    id,
    title: `T${id}`,
    category,
    locale: 'en',
    body: '',
    shortcut: '',
    createdBy: null,
    createdAt: '',
    updatedAt: '',
  });
  const all = [template(1, 'delay'), template(2, 'howto'), template(3, 'refund')];

  it('offers the ticket’s category and the how-to templates', () => {
    expect(templatesFor(all, 'delay').map((t) => t.id)).toEqual([1, 2]);
    expect(templatesFor(all, 'refund').map((t) => t.id)).toEqual([2, 3]);
  });

  it('offers them all to a ticket without a category', () => {
    expect(templatesFor(all, null)).toHaveLength(3);
  });
});
