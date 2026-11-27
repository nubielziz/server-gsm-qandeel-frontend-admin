// Tests for the legal document helpers: the document names, the next version suggestion and the grouping of the rows.
import { describe, expect, it } from 'vitest';
import type { LegalDocument } from '../types';
import {
  earlierVersionName,
  FIRST_VERSION,
  groupLegal,
  legalTypeLabel,
  nextVersionFor,
  suggestNextVersion,
  versionInForce,
} from './legal';

const doc = (id: number, over: Partial<LegalDocument>): LegalDocument => ({
  id,
  type: 'terms',
  version: '1.0',
  locale: 'en',
  bodyMd: '',
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  isCurrent: false,
  requiresReacceptance: false,
  createdAt: `2026-01-0${id}T00:00:00.000Z`,
  acceptedCount: null,
  ...over,
});

describe('names', () => {
  it('names the four documents and passes unknown words through', () => {
    expect(legalTypeLabel('refund')).toBe('Refund policy');
    expect(legalTypeLabel('imprint')).toBe('imprint');
  });

  it('names an earlier version, and marks a retired text in another language with its code in capitals', () => {
    expect(earlierVersionName(doc(1, { version: '3.1' }))).toBe('Terms of service v3.1');
    expect(earlierVersionName(doc(2, { version: '3.2', locale: 'tr' }))).toBe(
      'Terms of service v3.2 (retired TR text)',
    );
  });
});

describe('suggestNextVersion', () => {
  it('adds one to the last number, as the demo did to the part after the dot', () => {
    expect(suggestNextVersion('3.2')).toBe('3.3');
    expect(suggestNextVersion('1.9')).toBe('1.10');
    expect(suggestNextVersion('4')).toBe('5');
    expect(suggestNextVersion('v2')).toBe('v3');
  });

  it('adds a minor number to a version it cannot read', () => {
    expect(suggestNextVersion('beta')).toBe('beta.1');
  });
});

describe('nextVersionFor', () => {
  it('follows the newest version of the chosen document, whatever the other documents hold', () => {
    const rows = [
      doc(1, { type: 'terms', version: '3.1' }),
      doc(3, { type: 'terms', version: '3.2' }),
      doc(2, { type: 'privacy', version: '1.4' }),
    ];
    expect(nextVersionFor(rows, 'terms')).toBe('3.3');
    expect(nextVersionFor(rows, 'privacy')).toBe('1.5');
  });

  it('counts the drafts and moves on past a number another version of the document already holds', () => {
    const rows = [
      doc(1, { version: '3.1' }),
      doc(2, { version: '3.2', isCurrent: true }),
      doc(3, { version: '3.3', effectiveFrom: null }),
      doc(4, { version: '3.4', effectiveFrom: null, createdAt: '2026-01-02T12:00:00.000Z' }),
    ];
    // The newest row by date is 3.3 (id 3), and a 3.4 made earlier than it still holds its number.
    expect(nextVersionFor(rows, 'terms')).toBe('3.5');
    expect(
      nextVersionFor([doc(1, { version: '3.2' }), doc(2, { version: '3.3', effectiveFrom: null })], 'terms'),
    ).toBe('3.4');
  });

  it('starts a document that has no version yet at 1.0, and answers that when there are no rows at all', () => {
    expect(nextVersionFor([doc(1, { type: 'terms' })], 'cookies')).toBe(FIRST_VERSION);
    expect(nextVersionFor([], 'terms')).toBe('1.0');
  });
});

describe('groupLegal', () => {
  it('splits by the flags the server sent and orders by document and newest first', () => {
    const rows = [
      doc(1, { type: 'privacy', isCurrent: true }),
      doc(2, { type: 'terms', locale: 'tr' }),
      doc(3, { type: 'terms', isCurrent: true }),
      doc(4, { type: 'terms', effectiveFrom: null }),
      doc(5, { type: 'terms', version: '0.9' }),
      doc(6, { type: 'terms', version: '0.95' }),
    ];
    const groups = groupLegal(rows);
    expect(groups.current.map((d) => d.id)).toEqual([3, 1]);
    expect(groups.drafts.map((d) => d.id)).toEqual([4]);
    // A retired version in another language is kept for the record with the earlier ones, newest first.
    expect(groups.earlier.map((d) => d.id)).toEqual([6, 5, 2]);
    // A draft is listed with the versions in force, above the version it will replace.
    expect(groups.shown.map((d) => d.id)).toEqual([4, 3, 1]);
  });
});

describe('versionInForce', () => {
  it('finds the current version of the same document', () => {
    const rows = [doc(1, { isCurrent: true }), doc(2, { type: 'privacy', isCurrent: true }), doc(3, {})];
    expect(versionInForce(rows, rows[2])?.id).toBe(1);
    expect(versionInForce(rows, { type: 'refund' })).toBeUndefined();
  });
});
