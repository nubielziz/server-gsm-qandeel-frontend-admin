// Tests for the words of the Retail pricing tab: the target of a rule, the badge of every kind and reason of a price change (checked
// against the unions the backend lists), the sentences of a skipped id and of a preview.
import { describe, expect, it } from 'vitest';
import {
  atFloorText,
  changeWords,
  noRuleText,
  previewSummary,
  ROUNDING_OPTIONS,
  ruleTargetName,
  SCOPE_OPTIONS,
  skippedText,
  TYPE_OPTIONS,
} from './retailPricing';
import type {
  RetailChangeKind,
  RetailChangeReason,
  RetailChangeResolution,
  RetailPriceChange,
  RetailRounding,
  RetailRuleScope,
} from '../types';

const KINDS: RetailChangeKind[] = ['followed', 'proposed', 'detached'];
const REASONS: RetailChangeReason[] = [
  'cost_changed',
  'rule_changed',
  'floor_changed',
  'cost_jump',
  'no_cost',
  'changed_elsewhere',
];
const RESOLUTIONS: RetailChangeResolution[] = ['applied', 'kept', 'superseded'];

type Shape = Pick<RetailPriceChange, 'kind' | 'reason' | 'waiting' | 'resolution'>;
const change = (kind: RetailChangeKind, reason: RetailChangeReason, rest: Partial<Shape> = {}): Shape => ({
  kind,
  reason,
  waiting: false,
  resolution: null,
  ...rest,
});

describe('the menus', () => {
  it('offer every scope, rounding and type the backend lists', () => {
    const scopes: RetailRuleScope[] = ['global', 'type', 'category'];
    const roundings: RetailRounding[] = ['cent', 'step_0.05', 'step_0.10', 'ends_99'];
    expect(SCOPE_OPTIONS.map((option) => option.value)).toEqual(scopes);
    expect(ROUNDING_OPTIONS.map((option) => option.value)).toEqual(roundings);
    expect(ROUNDING_OPTIONS.map((option) => option.label)).toEqual([
      'Whole cents',
      'Up to the next 5 cents',
      'Up to the next 10 cents',
      'Ends in .99',
    ]);
    expect(TYPE_OPTIONS.map((option) => option.label)).toEqual(['IMEI', 'Server', 'Remote', 'File']);
  });
});

describe('ruleTargetName', () => {
  it('names what a rule covers for a button’s accessible name', () => {
    const base = { serviceType: null, categoryName: null, categoryId: null };
    expect(ruleTargetName({ ...base, scope: 'global' })).toBe('every service');
    expect(ruleTargetName({ ...base, scope: 'type', serviceType: 'imei' })).toBe('IMEI services');
    expect(
      ruleTargetName({ ...base, scope: 'category', categoryName: 'Carrier unlock', categoryId: 4 }),
    ).toBe('Carrier unlock');
    expect(ruleTargetName({ ...base, scope: 'category', categoryId: 9 })).toBe('category 9');
  });
});

describe('changeWords', () => {
  it('words a proposal that waits as Waiting for approval, with the reason', () => {
    expect(changeWords(change('proposed', 'cost_jump', { waiting: true }))).toEqual({
      tone: 'accent',
      icon: 'clock',
      label: 'Waiting for approval',
      note: 'The cost moved more than the rule allows by itself.',
    });
    expect(changeWords(change('proposed', 'no_cost', { waiting: true })).note).toBe(
      'The service has no cost now.',
    );
  });

  it('words a closed proposal by how it was closed', () => {
    const words = (resolution: RetailChangeResolution) =>
      changeWords(change('proposed', 'cost_jump', { resolution })).label;
    expect(words('applied')).toBe('Approved');
    expect(words('kept')).toBe('Kept the price');
    expect(words('superseded')).toBe('No longer needed');
  });

  it('words a followed price by what moved it, and a detached one as stopped following', () => {
    expect(changeWords(change('followed', 'cost_changed'))).toMatchObject({
      tone: 'good',
      label: 'Followed the cost',
    });
    expect(changeWords(change('followed', 'rule_changed'))).toMatchObject({
      tone: 'neutral',
      label: 'Rule changed',
    });
    expect(changeWords(change('followed', 'floor_changed'))).toMatchObject({
      tone: 'neutral',
      label: 'Floor changed',
    });
    expect(changeWords(change('detached', 'changed_elsewhere'))).toMatchObject({
      tone: 'warn',
      label: 'Stopped following',
      note: 'The price was changed outside the rule.',
    });
  });

  it('has a badge with an icon and a word for every kind, reason and resolution the backend can send', () => {
    for (const kind of KINDS) {
      for (const reason of REASONS) {
        for (const resolution of [null, ...RESOLUTIONS]) {
          for (const waiting of [true, false]) {
            const words = changeWords(change(kind, reason, { resolution, waiting }));
            expect(words.label.length).toBeGreaterThan(0);
            expect(words.icon).toBeTruthy();
          }
        }
      }
    }
  });
});

describe('skippedText', () => {
  it('says why in words, with the service when the table still holds it, and passes an unknown reason through', () => {
    expect(skippedText({ id: 5, reason: 'changed' }, 'Orange France Unlock')).toBe(
      'Orange France Unlock: the price moved, so the new figure is shown and needs your approval again.',
    );
    expect(skippedText({ id: 6, reason: 'no_cost' }, 'EE UK Unlock')).toContain('has no cost');
    expect(skippedText({ id: 7, reason: 'no_rule' }, undefined)).toBe(
      'Change 7: no pricing rule covers it now.',
    );
    expect(skippedText({ id: 8, reason: 'not_waiting' }, 'X')).toBe('X: it was already resolved.');
    expect(skippedText({ id: 9, reason: 'too_old' }, 'X')).toBe('X: too_old.');
  });
});

describe('the preview sentences', () => {
  it('reads the server’s counts', () => {
    expect(previewSummary({ changes: 3, following: 12, raised: 2, lowered: 1 })).toBe(
      '3 of 12 prices change: 2 up, 1 down',
    );
    expect(previewSummary({ changes: 1, following: 1, raised: 1, lowered: 0 })).toBe(
      '1 of 1 price change: 1 up, 0 down',
    );
    expect(previewSummary({ changes: 1200, following: 2500, raised: 1000, lowered: 200 })).toBe(
      '1,200 of 2,500 prices change: 1,000 up, 200 down',
    );
  });

  it('says how many are held at their floor and how many have no rule left', () => {
    expect(atFloorText(1)).toBe('1 price is held at their floor: the margin is under what the floor allows.');
    expect(atFloorText(4)).toBe(
      '4 prices are held at their floor: the margin is under what the floor allows.',
    );
    expect(noRuleText(1)).toBe('1 service has no rule left and keeps the current price.');
    expect(noRuleText(3)).toBe('3 services have no rule left and keep the current price.');
  });
});
