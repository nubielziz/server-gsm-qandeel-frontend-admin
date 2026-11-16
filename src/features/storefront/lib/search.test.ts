// Tests for the Search tab's pure helpers: the cleaning of a term, the synonym checks, the personal-data guard, a rule's window,
// the date boxes, byte text and the small formatters.
import { describe, expect, it } from 'vitest';
import {
  addTerms,
  bytesText,
  documentsNote,
  engineNote,
  fromInputValue,
  lastErrorHint,
  looksPersonal,
  nextPosition,
  normaliseTerm,
  rowMessage,
  ruleState,
  synonymProblems,
  synonymText,
  toInputValue,
  windowText,
} from './search';

describe('normaliseTerm', () => {
  it('lower-cases, drops & and punctuation bars, and keeps one space between words', () => {
    expect(normaliseTerm('  FRP   Lock ')).toBe('frp lock');
    expect(normaliseTerm('AT&T')).toBe('att');
    expect(normaliseTerm('Samsung (KG) | lock; fix')).toBe('samsung kg lock fix');
  });

  it('removes emoji and control characters', () => {
    expect(normaliseTerm('unlock 🔓 iphone\u0000')).toBe('unlock iphone');
    expect(normaliseTerm('')).toBe('');
  });
});

describe('addTerms', () => {
  it('splits pasted lists, cleans each term and ignores repeats', () => {
    expect(addTerms([], 'FRP, google account lock;frp lock\nFRP')).toEqual([
      'frp',
      'google account lock',
      'frp lock',
    ]);
    expect(addTerms(['frp'], ' FRP ,icloud')).toEqual(['frp', 'icloud']);
  });

  it('adds nothing for empty text', () => {
    expect(addTerms(['frp'], ' , ;')).toEqual(['frp']);
  });
});

describe('synonymProblems', () => {
  it('asks for at least two terms and at most 20, each of at most 60 characters', () => {
    expect(synonymProblems('multi', '', ['frp']).terms).toMatch(/at least two/);
    expect(synonymProblems('multi', '', ['frp', 'frp lock'])).toEqual({});
    expect(
      synonymProblems(
        'multi',
        '',
        Array.from({ length: 21 }, (_, i) => `t${i}`),
      ).terms,
    ).toMatch(/at most 20/);
    expect(synonymProblems('multi', '', ['a', 'b'.repeat(61)]).terms).toMatch(/at most 60/);
  });

  it('asks a one-way rule for a root that is not one of its terms', () => {
    expect(synonymProblems('one_way', ' ', ['a', 'b']).root).toMatch(/Enter the word/);
    expect(synonymProblems('one_way', 'KG', ['kg', 'knox']).root).toMatch(/cannot also be/);
    expect(synonymProblems('one_way', 'kg', ['knox guard', 'knox lock'])).toEqual({});
    // The root of a multi-way rule is not read.
    expect(synonymProblems('multi', '', ['a', 'b']).root).toBeUndefined();
  });
});

describe('synonymText', () => {
  it('writes a multi-way rule with equals signs and a one-way rule with an arrow', () => {
    expect(synonymText({ kind: 'multi', root: null, terms: ['frp', 'frp lock'] })).toBe('frp = frp lock');
    expect(synonymText({ kind: 'one_way', root: 'kg', terms: ['knox guard', 'knox lock'] })).toBe(
      'kg → knox guard, knox lock',
    );
  });
});

describe('looksPersonal', () => {
  it('flags emails, links, phone numbers, IMEIs and order numbers', () => {
    for (const term of [
      'me@mail.com',
      'https://x.test',
      'www.x.test',
      '+44 7700 900123',
      '354123456789012',
      'ord 123456',
    ])
      expect(looksPersonal(term)).toBe(true);
  });

  it('leaves model numbers and plain searches alone', () => {
    for (const term of ['iphone 15 unlock', 'sm-a525f', 'o2 uk', 'a2633'])
      expect(looksPersonal(term)).toBe(false);
  });
});

describe('ruleState and windowText', () => {
  const now = Date.parse('2026-12-10T12:00:00.000Z');
  it('tells off, scheduled, ended and live apart', () => {
    expect(ruleState({ isEnabled: false, startsAt: null, endsAt: null }, now)).toBe('off');
    expect(ruleState({ isEnabled: true, startsAt: '2026-12-20T00:00:00.000Z', endsAt: null }, now)).toBe(
      'scheduled',
    );
    expect(ruleState({ isEnabled: true, startsAt: null, endsAt: '2026-12-01T00:00:00.000Z' }, now)).toBe(
      'ended',
    );
    expect(
      ruleState(
        { isEnabled: true, startsAt: '2026-12-01T00:00:00.000Z', endsAt: '2026-12-31T00:00:00.000Z' },
        now,
      ),
    ).toBe('live');
  });

  it('writes the dates of a rule', () => {
    expect(windowText({ startsAt: null, endsAt: null })).toBe('Always');
    expect(windowText({ startsAt: '2026-12-01T09:00:00.000Z', endsAt: null })).toMatch(/^From /);
    expect(windowText({ startsAt: null, endsAt: '2026-12-31T09:00:00.000Z' })).toMatch(/^Until /);
    expect(windowText({ startsAt: '2026-12-01T09:00:00.000Z', endsAt: '2026-12-31T09:00:00.000Z' })).toMatch(
      / to /,
    );
  });
});

describe('date boxes', () => {
  it('round-trips an ISO time through a datetime-local value in the local zone', () => {
    const iso = new Date(2026, 11, 5, 9, 30).toISOString();
    expect(toInputValue(iso)).toBe('2026-12-05T09:30');
    expect(fromInputValue('2026-12-05T09:30')).toBe(iso);
  });

  it('gives empty text for nothing and null for an empty or unreadable box', () => {
    expect(toInputValue(null)).toBe('');
    expect(toInputValue('nonsense')).toBe('');
    expect(fromInputValue('')).toBeNull();
    expect(fromInputValue('nonsense')).toBeNull();
  });
});

describe('bytesText', () => {
  it('prints bytes in steps of 1024 and says when there is no figure', () => {
    expect(bytesText(512)).toBe('512 B');
    expect(bytesText(48_234_496)).toBe('46 MB');
    expect(bytesText(1_288_490_189)).toBe('1.2 GB');
    expect(bytesText(null)).toBe('No data');
  });
});

describe('small helpers', () => {
  it('finds the first free pin position', () => {
    expect(nextPosition([])).toBe(1);
    expect(nextPosition([1, 2, 4])).toBe(3);
    expect(nextPosition([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBeNull();
  });

  it('says how far the index is from the catalogue', () => {
    expect(documentsNote(14, 14)).toBe('in sync with the catalogue');
    expect(documentsNote(11, 14)).toBe('3 missing from the index');
    expect(documentsNote(16, 14)).toBe('2 more than the catalogue');
  });

  it('says what the shop does while the engine is not running', () => {
    expect(engineNote('ok', '30.2')).toBe('Typesense 30.2');
    expect(engineNote('ok', null)).toBeUndefined();
    expect(engineNote('not_ready', null)).toMatch(/no index yet/);
    expect(engineNote('down', null)).toMatch(/database search/);
  });

  it('turns the engine’s disk refusal into a sentence and leaves other errors alone', () => {
    expect(lastErrorHint('Rejecting write: running out of resource type: OUT_OF_DISK')).toMatch(
      /disk is nearly full/,
    );
    expect(lastErrorHint('Import of 3 documents failed')).toBeUndefined();
    expect(lastErrorHint(null)).toBeUndefined();
  });

  it('reads one row of an error tree', () => {
    expect(rowMessage({ 0: { serviceId: { message: 'No listing.' } } }, 0)).toBe('No listing.');
    expect(rowMessage({ 1: { message: 'Bad.' } }, 1)).toBe('Bad.');
    expect(rowMessage(undefined, 0)).toBeUndefined();
  });
});
