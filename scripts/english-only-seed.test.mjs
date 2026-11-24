// Tests for the English-only step of the demo seed (decision 039): the language is taken out of the captured state, and the committed
// file has none, so `seed:extract` and the mock layer agree.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { dropLanguages, formatDemoState } from './english-only-seed.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('dropLanguages', () => {
  const demo = () => ({
    customers: [
      { id: 'c1', name: 'Pat', locale: 'en' },
      { id: 'c2', name: 'Sam', locale: 'fr' },
    ],
    listings: [{ sid: 's1', langs: 'EN, AR', title: 'iCloud' }],
    landing: [{ id: 'lp1', langs: 'EN' }],
    pages: [{ id: 'pg1', langs: 'EN, AR' }],
    legal: [
      { id: 'lg1', type: 'Terms of service', lang: 'EN', current: true },
      { id: 'lg2', type: 'Terms of service', lang: 'AR', current: true },
      { id: 'lg3', type: 'Privacy policy', lang: 'en', current: true },
    ],
    orders: [{ id: 'o1', locale: 'kept: not a table of languages' }],
  });

  it('removes the customer language and the language lists of listings, landing pages and static pages', () => {
    const state = dropLanguages(demo());
    expect(state.customers).toEqual([
      { id: 'c1', name: 'Pat' },
      { id: 'c2', name: 'Sam' },
    ]);
    expect(state.listings).toEqual([{ sid: 's1', title: 'iCloud' }]);
    expect(state.landing).toEqual([{ id: 'lp1' }]);
    expect(state.pages).toEqual([{ id: 'pg1' }]);
  });

  it('drops the legal rows that are not English and the language of the others', () => {
    expect(dropLanguages(demo()).legal).toEqual([
      { id: 'lg1', type: 'Terms of service', current: true },
      { id: 'lg3', type: 'Privacy policy', current: true },
    ]);
  });

  it('touches nothing else, and a state without these tables is fine', () => {
    expect(dropLanguages(demo()).orders).toEqual(demo().orders);
    expect(dropLanguages({ seq: { order: 1 } })).toEqual({ seq: { order: 1 } });
  });
});

describe('formatDemoState', () => {
  it('writes one line per top-level key, the way the extract does', () => {
    expect(formatDemoState(5, { a: [1, 2], b: { c: 'x' } })).toBe(
      '{"capturedAt":5,"state":{\n"a":[1,2],\n"b":{"c":"x"}\n}}\n',
    );
  });
});

describe('the committed demo state', () => {
  const { state } = JSON.parse(readFileSync(resolve(root, 'src/mocks/seed/demo-state.json'), 'utf8'));

  it('has no language: no customer locale, no language list, no legal language', () => {
    expect(state.customers.length).toBeGreaterThan(0);
    for (const key of ['listings', 'pages']) {
      expect(state[key].length).toBeGreaterThan(0);
      expect(
        state[key].some((row) => 'langs' in row),
        key,
      ).toBe(false);
    }
    expect(state.customers.some((row) => 'locale' in row)).toBe(false);
    expect(state.legal.some((row) => 'lang' in row)).toBe(false);
  });

  it('holds one Terms of service in force: the Arabic twin is gone', () => {
    const terms = state.legal.filter((row) => row.type === 'Terms of service' && row.current);
    expect(terms.map((row) => row.id)).toEqual(['lg1']);
    expect(state.legal.map((row) => row.id)).toEqual(['lg1', 'lg3', 'lg4', 'lg5', 'lg6']);
  });
});
