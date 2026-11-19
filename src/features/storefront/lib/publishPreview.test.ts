// Tests for what the preview of a draft asks the server and how its toolbar speaks: the address's filters as the rows route's
// filters, the five status chips and what each sets, the options of the selects, the `select` of a bulk call (ticked ids or "all
// that match" as a filter) and the sentence a bulk call answers with. All pure; the server decides which rows match.
import { describe, expect, it } from 'vitest';
import { PUBLISH_FLAGS, type PublishRun } from '../types';
import {
  BRAND_KIND_OPTIONS,
  BULK_IDS_MAX,
  bulkNote,
  bulkSelect,
  chipFilters,
  chipOf,
  chipsOf,
  FACT_WORDS,
  flagOptions,
  matchKey,
  previewFilters,
} from './publishPreview';
import { PUBLISH_ITEMS_VIEW } from './views';

const view = (q = '', filters: Record<string, string> = {}) => ({
  q,
  filters: { result: '', state: '', included: '', flag: '', brandKind: '', ...filters },
});

describe('previewFilters', () => {
  it('keeps only the filters that are on, as the rows route names them', () => {
    expect(previewFilters({})).toEqual({});
    expect(previewFilters(view().filters)).toEqual({});
    expect(
      previewFilters({ state: 'review', included: 'false', flag: 'title_long', brandKind: 'tool' }),
    ).toEqual({ state: 'review', included: false, flag: 'title_long', brandKind: 'tool' });
  });

  it('drops anything the server would not know, and never sends the result filter', () => {
    expect(
      previewFilters({
        state: 'done',
        flag: 'bogus',
        brandKind: 'planet',
        included: 'true',
        result: 'published',
      }),
    ).toEqual({});
  });
});

describe('the address knows the preview’s filters', () => {
  it('lists the filters of the preview in the view of the rows', () => {
    expect(Object.keys(PUBLISH_ITEMS_VIEW.filters).sort()).toEqual([
      'brandKind',
      'flag',
      'included',
      'result',
      'state',
    ]);
    expect(PUBLISH_ITEMS_VIEW.filters.flag).toEqual(PUBLISH_FLAGS);
    expect(PUBLISH_ITEMS_VIEW.filters.included).toEqual(['false']);
  });
});

describe('matchKey', () => {
  it('changes with the search text and with every filter, and not with the page or the sort', () => {
    const base = matchKey(view());
    expect(matchKey(view('att'))).not.toBe(base);
    expect(matchKey(view('', { state: 'ready' }))).not.toBe(base);
    expect(matchKey(view('', { flag: 'no_brand' }))).not.toBe(base);
    expect(matchKey({ ...view(), page: 2, sort: { field: 'cost', order: 'desc' } } as never)).toBe(base);
  });

  it('ignores spaces around the search text', () => {
    expect(matchKey(view('  att '))).toBe(matchKey(view('att')));
  });
});

describe('the chips', () => {
  it('reads the chip from the address: one at a time, Left out first', () => {
    expect(chipOf({})).toBe('');
    expect(chipOf({ state: 'ready' })).toBe('ready');
    expect(chipOf({ state: 'blocked' })).toBe('blocked');
    expect(chipOf({ included: 'false' })).toBe('out');
    expect(chipOf({ state: 'ready', included: 'false' })).toBe('out');
    expect(chipOf({ state: 'nonsense' })).toBe('');
  });

  it('sets its own filter and switches the other one off', () => {
    expect(chipFilters('')).toEqual({ state: '', included: '' });
    expect(chipFilters('ready')).toEqual({ state: 'ready', included: '' });
    expect(chipFilters('review')).toEqual({ state: 'review', included: '' });
    expect(chipFilters('blocked')).toEqual({ state: 'blocked', included: '' });
    expect(chipFilters('out')).toEqual({ state: '', included: 'false' });
  });

  it('shows the run’s own counts, and Left out is the rows that will not be published', () => {
    const run = {
      total: 60,
      counts: { ready: 30, review: 11, blocked: 19, included: 30 },
    } as Pick<PublishRun, 'total' | 'counts'>;
    expect(chipsOf(run)).toEqual([
      { value: '', label: 'All' },
      { value: 'ready', label: 'Ready (30)' },
      { value: 'review', label: 'Needs a look (11)' },
      { value: 'blocked', label: 'Cannot publish (19)' },
      { value: 'out', label: 'Left out (30)' },
    ]);
  });

  it('never counts a negative Left out', () => {
    const run = { total: 3, counts: { ready: 3, review: 0, blocked: 0, included: 5 } } as Pick<
      PublishRun,
      'total' | 'counts'
    >;
    expect(chipsOf(run)[4].label).toBe('Left out (0)');
  });
});

describe('the selects', () => {
  it('offers every flag the server can set, in its words, after "Any flag"', () => {
    const options = flagOptions();
    expect(options[0]).toEqual({ value: '', label: 'Any flag' });
    expect(options.slice(1).map((option) => option.value)).toEqual([...PUBLISH_FLAGS]);
    expect(options.find((option) => option.value === 'title_taken')?.label).toBe(
      'Another listing has this title',
    );
  });

  it('offers the three kinds of brand after "Any brand"', () => {
    expect(BRAND_KIND_OPTIONS.map((option) => option.value)).toEqual(['', 'device', 'tool', 'app']);
  });
});

describe('bulkSelect', () => {
  it('names the ticked rows by id', () => {
    expect(bulkSelect([3, 5], false, view())).toEqual({ itemIds: [3, 5] });
  });

  it('sends the table’s filter and search for "all that match", and no ids', () => {
    expect(bulkSelect([3], true, view('  att ', { state: 'review', included: 'false' }))).toEqual({
      filter: { state: 'review', included: false, q: 'att' },
    });
    expect(bulkSelect([3], true, view())).toEqual({ filter: {} });
  });

  it('is null when nothing is ticked, or when more rows are ticked than the route takes by id', () => {
    expect(bulkSelect([], false, view())).toBeNull();
    const many = Array.from({ length: BULK_IDS_MAX + 1 }, (_, i) => i + 1);
    expect(bulkSelect(many, false, view())).toBeNull();
    expect(bulkSelect(many.slice(0, BULK_IDS_MAX), false, view())).toEqual({
      itemIds: many.slice(0, BULK_IDS_MAX),
    });
    // "All that match" has no limit by id.
    expect(bulkSelect(many, true, view())).toEqual({ filter: {} });
  });
});

describe('bulkNote', () => {
  it('says how many rows changed', () => {
    expect(bulkNote({ changed: 12, refused: 0 })).toBe('12 rows changed.');
    expect(bulkNote({ changed: 1, refused: 0 })).toBe('1 row changed.');
    expect(bulkNote({ changed: 0, refused: 0 })).toBe('0 rows changed.');
  });

  it('says how many could not be included, in the singular and the plural', () => {
    expect(bulkNote({ changed: 5, refused: 3 })).toBe(
      '5 rows changed. 3 rows could not be included: they cannot be published.',
    );
    expect(bulkNote({ changed: 0, refused: 1 })).toBe(
      '0 rows changed. 1 row could not be included: it cannot be published.',
    );
  });
});

describe('FACT_WORDS', () => {
  it('has the three facts a bulk call can set, with the lengths the row dialog and the server use', () => {
    expect(Object.keys(FACT_WORDS)).toEqual(['brand', 'carrier', 'country']);
    expect(FACT_WORDS.brand.max).toBe(80);
    expect(FACT_WORDS.carrier.max).toBe(80);
    expect(FACT_WORDS.country.max).toBe(2);
    for (const words of Object.values(FACT_WORDS)) expect(words.hint).toMatch(/Leave it empty to clear/);
  });
});
