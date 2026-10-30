// Tests for the legal document helpers: the document names, the next version suggestion and the grouping of the rows.
import { describe, expect, it } from 'vitest';
import type { LegalDocument } from '../types';
import { groupLegal, legalLanguage, legalTypeLabel, suggestNextVersion, versionInForce } from './legal';

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
  it('names the four documents and the two languages, and passes unknown words through', () => {
    expect(legalTypeLabel('refund')).toBe('Refund policy');
    expect(legalTypeLabel('imprint')).toBe('imprint');
    expect(legalLanguage('ar')).toBe('Arabic');
    expect(legalLanguage('de')).toBe('DE');
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

describe('groupLegal', () => {
  it('splits by the flags the server sent and orders by document, language and newest first', () => {
    const rows = [
      doc(1, { type: 'privacy', isCurrent: true }),
      doc(2, { type: 'terms', locale: 'ar', isCurrent: true }),
      doc(3, { type: 'terms', isCurrent: true }),
      doc(4, { type: 'terms', effectiveFrom: null }),
      doc(5, { type: 'terms', version: '0.9' }),
    ];
    const groups = groupLegal(rows);
    expect(groups.current.map((d) => d.id)).toEqual([3, 2, 1]);
    expect(groups.drafts.map((d) => d.id)).toEqual([4]);
    expect(groups.earlier.map((d) => d.id)).toEqual([5]);
    // A draft is listed with the versions in force, above the version it will replace.
    expect(groups.shown.map((d) => d.id)).toEqual([4, 3, 2, 1]);
  });
});

describe('versionInForce', () => {
  it('finds the current version of the same document and language', () => {
    const rows = [doc(1, { isCurrent: true }), doc(2, { locale: 'ar', isCurrent: true }), doc(3, {})];
    expect(versionInForce(rows, rows[2])?.id).toBe(1);
    expect(versionInForce(rows, { type: 'refund', locale: 'en' })).toBeUndefined();
  });
});
